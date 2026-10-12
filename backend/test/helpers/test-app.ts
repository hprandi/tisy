import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PAYMENT_PROVIDER } from '../../src/payments/payment-provider.interface';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthApi } from './api/auth-api';
import { CheckInApi } from './api/check-in-api';
import { EventsApi } from './api/events-api';
import { OrdersApi } from './api/orders-api';
import { PaymentWebhookApi } from './api/payment-webhook-api';
import { TicketTiersApi } from './api/ticket-tiers-api';
import { FakeMercadoPagoApi } from './fake-mercadopago-api';
import { FakePaymentProvider } from './fake-payment-provider';
import { resetDatabase } from './reset-database';

export interface AppContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  auth: AuthApi;
  orders: OrdersApi;
  events: EventsApi;
  ticketTiers: TicketTiersApi;
  webhook: PaymentWebhookApi;
  checkIn: CheckInApi;
}

// The payment provider is replaced by a fake.
export interface TestContext extends AppContext {
  paymentProvider: FakePaymentProvider;
}

// The real Mercado Pago provider runs; only its HTTP API is faked.
export interface MercadoPagoTestContext extends AppContext {
  mercadoPago: FakeMercadoPagoApi;
}

function bootApp(context: AppContext, paymentProvider?: FakePaymentProvider) {
  beforeAll(async () => {
    let builder = Test.createTestingModule({ imports: [AppModule] });
    if (paymentProvider) {
      builder = builder
        .overrideProvider(PAYMENT_PROVIDER)
        .useValue(paymentProvider);
    }
    const moduleFixture = await builder.compile();

    const app: INestApplication<App> = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    Object.assign(context, {
      app,
      prisma: app.get(PrismaService),
      auth: new AuthApi(app),
      orders: new OrdersApi(app),
      events: new EventsApi(app),
      ticketTiers: new TicketTiersApi(app),
      webhook: new PaymentWebhookApi(app),
      checkIn: new CheckInApi(app),
    });
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });
}

// Call inside a describe: boots the app once for the file, resets the database
// before every test and closes the app at the end. The returned context is
// filled in before the first test runs.
export function useTestApp(): TestContext {
  const paymentProvider = new FakePaymentProvider();
  const context = { paymentProvider } as TestContext;

  bootApp(context, paymentProvider);
  beforeEach(() => paymentProvider.reset());

  return context;
}

// Same as useTestApp, but with the real Mercado Pago provider.
export function useTestAppWithMercadoPago(): MercadoPagoTestContext {
  const mercadoPago = new FakeMercadoPagoApi();
  const context = { mercadoPago } as MercadoPagoTestContext;

  beforeAll(() => mercadoPago.install());
  bootApp(context);
  afterEach(() => mercadoPago.reset());
  afterAll(() => mercadoPago.uninstall());

  return context;
}
