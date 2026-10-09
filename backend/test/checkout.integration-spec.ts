import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType, EventStatus, OrderStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  PAYMENT_PROVIDER,
  type PaymentConfirmationStatus,
} from '../src/payments/payment-provider.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakePaymentProvider } from './helpers/fake-payment-provider';
import { resetDatabase } from './helpers/reset-database';

const HOUR_IN_MS = 60 * 60 * 1000;

describe('Checkout (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fakePaymentProvider: FakePaymentProvider;

  beforeAll(async () => {
    fakePaymentProvider = new FakePaymentProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_PROVIDER)
      .useValue(fakePaymentProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  // Every checkout starts from an event on sale. The focused tests build it
  // straight in the database so they do not depend on the organizer's endpoints.
  async function seedEventOnSale(): Promise<{
    eventId: string;
    tierId: string;
  }> {
    const event = await prisma.event.create({
      data: {
        title: 'Seeded Event',
        location: 'Test Venue',
        startDate: new Date(Date.now() + 24 * HOUR_IN_MS),
        endDate: new Date(Date.now() + 48 * HOUR_IN_MS),
        status: EventStatus.PUBLISHED,
        organizer: {
          create: {
            name: 'Seeded Organizer',
            email: 'organizer@test.com',
            documentType: DocumentType.CPF,
            documentNumber: '12345678901',
          },
        },
        ticketTiers: {
          create: {
            name: 'General',
            currency: 'BRL',
            price: 50,
            quantityTotal: 10,
            quantityAvailable: 10,
            salesStartAt: new Date(Date.now() - HOUR_IN_MS),
            salesEndAt: new Date(Date.now() + 24 * HOUR_IN_MS),
          },
        },
      },
      include: { ticketTiers: true },
    });

    return { eventId: event.id, tierId: event.ticketTiers[0].id };
  }

  // The happy path goes through the organizer's real endpoints instead.
  async function createEventOnSaleThroughApi(): Promise<{
    eventId: string;
    tierId: string;
  }> {
    const register = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test Organizer',
        email: 'organizer@test.com',
        password: 'Password123!',
        documentType: 'CPF',
        documentNumber: '12345678901',
      })
      .expect(201);
    const token = (register.body as { accessToken: string }).accessToken;

    const event = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Checkout Test Event',
        location: 'Test Venue',
        startDate: new Date(Date.now() + 24 * HOUR_IN_MS).toISOString(),
        endDate: new Date(Date.now() + 48 * HOUR_IN_MS).toISOString(),
      })
      .expect(201);
    const eventId = (event.body as { id: string }).id;

    const tier = await request(app.getHttpServer())
      .post(`/events/${eventId}/ticket-tiers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'General',
        price: 50,
        quantityTotal: 10,
        salesStartAt: new Date(Date.now() + 60 * 1000).toISOString(),
        salesEndAt: new Date(Date.now() + 24 * HOUR_IN_MS).toISOString(),
      })
      .expect(201);
    const tierId = (tier.body as { id: string }).id;

    // The API only accepts a sales start in the future, yet buying needs the
    // window already open — the one unavoidable shortcut in this journey.
    await prisma.ticketTier.update({
      where: { id: tierId },
      data: { salesStartAt: new Date(Date.now() - 60 * 1000) },
    });

    await request(app.getHttpServer())
      .post(`/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return { eventId, tierId };
  }

  async function createPendingOrder(
    eventId: string,
    tierId: string,
    quantity: number,
  ): Promise<{ id: string }> {
    const order = await request(app.getHttpServer())
      .post('/orders')
      .send({
        eventId,
        buyerType: 'new',
        buyerInfo: {
          name: 'Test Buyer',
          email: 'buyer@test.com',
          documentType: 'CPF',
          documentNumber: '98765432100',
        },
        items: [{ ticketTierId: tierId, quantity }],
      })
      .expect(201);

    return { id: (order.body as { id: string }).id };
  }

  async function startPayment(orderId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/payment`)
      .expect(200);
  }

  function reportPayment(orderId: string, status: PaymentConfirmationStatus) {
    fakePaymentProvider.nextOrderId = orderId;
    fakePaymentProvider.nextStatus = status;

    return request(app.getHttpServer())
      .post('/payments/webhook/mercadopago?data.id=fake-payment-id')
      .send({ type: 'payment', data: { id: 'fake-payment-id' } });
  }

  function findOrder(orderId: string) {
    return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  async function stockOf(tierId: string): Promise<number> {
    const tier = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: tierId },
    });
    return tier.quantityAvailable;
  }

  // Given an event on sale with a tier of 10 tickets
  // When a guest buyer orders 2, starts the payment and the payment provider reports it approved
  // Then the order ends PAID
  it('happy path: a guest buyer orders, pays and the order becomes PAID', async () => {
    const { eventId, tierId } = await createEventOnSaleThroughApi();

    const order = await createPendingOrder(eventId, tierId, 2);
    await startPayment(order.id);
    await reportPayment(order.id, 'approved').expect(200);

    expect((await findOrder(order.id)).status).toBe(OrderStatus.PAID);
  });

  // Given an event on sale with a tier of 10 tickets
  // When a guest buyer orders 2
  // Then the order is PENDING with total = 2 x price and an expiry set, and the tier stock is 8
  it.todo('placing an order reserves the stock');

  // Given a pending order of 2 tickets whose payment was started
  // When the payment provider reports the payment approved
  // Then the order is PAID, paidAt is set, paymentExternalId is the payment id
  //   (not the checkout session id) and the stock is still 8
  it('an approved payment marks the order PAID', async () => {
    const { eventId, tierId } = await seedEventOnSale();
    const order = await createPendingOrder(eventId, tierId, 2);
    await startPayment(order.id);

    await reportPayment(order.id, 'approved').expect(200);

    const paid = await findOrder(order.id);
    expect(paid.status).toBe(OrderStatus.PAID);
    expect(paid.paidAt).not.toBeNull();
    expect(paid.paymentExternalId).toBe('fake-payment-id');
    expect(await stockOf(tierId)).toBe(8);
  });

  // Given a pending order of 2 tickets (stock 8)
  // When the payment provider reports the payment cancelled
  // Then the order is CANCELLED and the stock is back to 10
  it('a cancelled payment cancels the order and releases the stock', async () => {
    const { eventId, tierId } = await seedEventOnSale();
    const order = await createPendingOrder(eventId, tierId, 2);
    expect(await stockOf(tierId)).toBe(8);

    await reportPayment(order.id, 'cancelled').expect(200);

    expect((await findOrder(order.id)).status).toBe(OrderStatus.CANCELLED);
    expect(await stockOf(tierId)).toBe(10);
  });

  // Given a pending order
  // When the payment provider first reports the payment pending, then approved
  // Then the order stays PENDING after the first notification and becomes PAID after the second
  it.todo('a pending payment waits and a later approval marks the order PAID');

  // Given a pending order of 2 tickets (stock 8)
  // When the same cancelled notification arrives twice
  // Then the stock is 10, not 12
  it.todo('a cancelled notification repeated twice releases the stock once');

  // Given a pending order
  // When the same approved notification arrives twice
  // Then the order is PAID and paidAt does not change on the second one
  it.todo('an approved notification repeated twice does not change paidAt');

  // Given a tier with 1 ticket left
  // When two buyers order it at the same time
  // Then exactly one gets 201 and the other 409, the stock is 0 and only one order exists
  it.todo('two buyers racing for the last ticket cannot oversell it');

  // Given an order whose payment was already started
  // When the buyer starts the payment again
  // Then the same checkoutUrl is returned and the provider is called only once
  it.todo('starting the payment twice returns the same checkout');

  // Table: draft event (400) | tier outside its sales window (400) | quantity above the stock (409)
  // When the buyer orders in each case
  // Then that status and no stock change
  it.todo('orders that are not allowed leave the stock untouched');
});
