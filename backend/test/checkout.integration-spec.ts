import { EventStatus, OrderStatus } from '@prisma/client';
import type { PaymentConfirmationStatus } from '../src/payments/payment-provider.interface';
import { aTicketTier, anEvent } from './helpers/builders';
import { checkoutHelpers } from './helpers/checkout-helpers';
import {
  HOUR_IN_MS,
  anOrganizer,
  seedEventOnSale,
  type SaleOverrides,
} from './helpers/fixtures';
import { useTestApp } from './helpers/test-app';

describe('Checkout (integration)', () => {
  const ctx = useTestApp();
  const { placeOrder, findOrder, stockOf } = checkoutHelpers(ctx);

  // The happy path prepares the event through the organizer's real endpoints.
  async function createEventOnSaleThroughApi() {
    const organizer = await anOrganizer(ctx.auth);
    const event = await ctx.events.create(organizer.token, anEvent());
    const eventId = event.body.id;
    const tier = await ctx.ticketTiers.create(
      organizer.token,
      eventId,
      aTicketTier(),
    );
    const tierId = tier.body.id;

    // The API only accepts a sales start in the future, yet buying needs the
    // window already open — the one unavoidable shortcut in this journey.
    await ctx.prisma.ticketTier.update({
      where: { id: tierId },
      data: { salesStartAt: new Date(Date.now() - HOUR_IN_MS) },
    });
    await ctx.events.publish(organizer.token, eventId);

    return { eventId, tierId };
  }

  function reportPayment(orderId: string, status: PaymentConfirmationStatus) {
    ctx.paymentProvider.nextOrderId = orderId;
    ctx.paymentProvider.nextStatus = status;

    return ctx.webhook.notify();
  }

  it('happy path: a guest buyer orders, pays and the order becomes PAID', async () => {
    // Given an event on sale with a tier of 10 tickets
    const { eventId, tierId } = await createEventOnSaleThroughApi();

    // When a guest buyer orders 2, starts the payment and the provider reports it approved
    const order = await placeOrder(eventId, tierId, 2);
    const payment = await ctx.orders.startPayment(order.body.id);
    const notification = await reportPayment(order.body.id, 'approved');

    // Then the order ends PAID
    expect(order.status).toBe(201);
    expect(payment.status).toBe(200);
    expect(notification.status).toBe(200);
    expect((await findOrder(order.body.id)).status).toBe(OrderStatus.PAID);
  });

  it('placing an order reserves the stock', async () => {
    // Given an event on sale with a tier of 10 tickets
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);

    // When a guest buyer orders 2
    const order = await placeOrder(eventId, tierId, 2);

    // Then the order is PENDING with total = 2 x price and an expiry set, and the tier stock is 8
    expect(order.status).toBe(201);
    expect(order.body).toMatchObject({
      status: OrderStatus.PENDING,
      totalAmount: '100',
    });
    expect(new Date(order.body.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
    expect(await stockOf(tierId)).toBe(8);
  });

  it('an approved payment marks the order PAID', async () => {
    // Given a pending order of 2 tickets whose payment was started
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);
    await ctx.orders.startPayment(order.body.id);

    // When the payment provider reports the payment approved
    await reportPayment(order.body.id, 'approved');

    // Then the order is PAID, paidAt is set, paymentExternalId is the payment id
    //   (not the checkout session id) and the stock is still 8
    const paid = await findOrder(order.body.id);
    expect(paid.status).toBe(OrderStatus.PAID);
    expect(paid.paidAt).not.toBeNull();
    expect(paid.paymentExternalId).toBe('fake-payment-id');
    expect(await stockOf(tierId)).toBe(8);
  });

  it('a cancelled payment cancels the order and releases the stock', async () => {
    // Given a pending order of 2 tickets (stock 8)
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);
    expect(await stockOf(tierId)).toBe(8);

    // When the payment provider reports the payment cancelled
    await reportPayment(order.body.id, 'cancelled');

    // Then the order is CANCELLED and the stock is back to 10
    expect((await findOrder(order.body.id)).status).toBe(OrderStatus.CANCELLED);
    expect(await stockOf(tierId)).toBe(10);
  });

  it('a pending payment waits and a later approval marks the order PAID', async () => {
    // Given a pending order
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);

    // When the payment provider first reports the payment pending, then approved
    await reportPayment(order.body.id, 'pending');
    const afterPending = await findOrder(order.body.id);
    await reportPayment(order.body.id, 'approved');
    const afterApproved = await findOrder(order.body.id);

    // Then the order stays PENDING after the first notification and becomes PAID after the second
    expect(afterPending.status).toBe(OrderStatus.PENDING);
    expect(afterApproved.status).toBe(OrderStatus.PAID);
  });

  it('a cancelled notification repeated twice releases the stock once', async () => {
    // Given a pending order of 2 tickets (stock 8)
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);

    // When the same cancelled notification arrives twice
    await reportPayment(order.body.id, 'cancelled');
    await reportPayment(order.body.id, 'cancelled');

    // Then the stock is 10, not 12
    expect(await stockOf(tierId)).toBe(10);
  });

  it('an approved notification repeated twice does not change paidAt', async () => {
    // Given a pending order
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);

    // When the same approved notification arrives twice
    await reportPayment(order.body.id, 'approved');
    const firstPaidAt = (await findOrder(order.body.id)).paidAt;
    await reportPayment(order.body.id, 'approved');

    // Then the order is PAID and paidAt does not change on the second one
    const afterSecond = await findOrder(order.body.id);
    expect(afterSecond.status).toBe(OrderStatus.PAID);
    expect(afterSecond.paidAt).toEqual(firstPaidAt);
  });

  it('two buyers racing for the last ticket cannot oversell it', async () => {
    // Given a tier with 1 ticket left
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma, {
      tickets: 1,
    });

    // When two buyers order it at the same time
    const results = await Promise.all([
      placeOrder(eventId, tierId, 1),
      placeOrder(eventId, tierId, 1),
    ]);

    // Then exactly one gets 201 and the other 409, the stock is 0 and only one order exists
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await stockOf(tierId)).toBe(0);
    expect(await ctx.prisma.order.count()).toBe(1);
  });

  it('starting the payment twice returns the same checkout', async () => {
    // Given an order whose payment was already started
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);
    const first = await ctx.orders.startPayment(order.body.id);

    // When the buyer starts the payment again
    const second = await ctx.orders.startPayment(order.body.id);

    // Then the same checkoutUrl is returned and the provider is called only once
    expect(second.body.checkoutUrl).toBe(first.body.checkoutUrl);
    expect(ctx.paymentProvider.startPaymentCalls).toBe(1);
  });

  describe('orders that are not allowed', () => {
    // Table: draft event (400) | tier outside its sales window (400) | quantity above the stock (409)
    it.each<[string, SaleOverrides, number, number]>([
      [
        'an event that is still a draft',
        { eventStatus: EventStatus.DRAFT },
        1,
        400,
      ],
      [
        'a tier whose sales have not started',
        { salesStartAt: new Date(Date.now() + HOUR_IN_MS) },
        1,
        400,
      ],
      ['more tickets than the stock', { tickets: 2 }, 3, 409],
    ])(
      '%s is rejected and leaves the stock untouched',
      async (_case, sale, quantity, expectedStatus) => {
        // Given an event and a tier matching the case
        const { eventId, tierId } = await seedEventOnSale(ctx.prisma, sale);
        const stockBefore = await stockOf(tierId);

        // When the buyer orders
        const result = await placeOrder(eventId, tierId, quantity);

        // Then that status and no stock change
        expect(result.status).toBe(expectedStatus);
        expect(await stockOf(tierId)).toBe(stockBefore);
      },
    );
  });
});
