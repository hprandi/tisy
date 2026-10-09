import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PAYMENT_PROVIDER } from '../../src/payments/payment-provider.interface';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthApi } from './api/auth-api';
import { EventsApi } from './api/events-api';
import { OrdersApi } from './api/orders-api';
import { TicketTiersApi } from './api/ticket-tiers-api';
import { FakePaymentProvider } from './fake-payment-provider';
import { resetDatabase } from './reset-database';

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  paymentProvider: FakePaymentProvider;
  auth: AuthApi;
  orders: OrdersApi;
  events: EventsApi;
  ticketTiers: TicketTiersApi;
}

// Call inside a describe: boots the app once for the file, resets the database
// before every test and closes the app at the end. The returned context is
// filled in before the first test runs.
export function useTestApp(): TestContext {
  const context = {} as TestContext;

  beforeAll(async () => {
    const paymentProvider = new FakePaymentProvider();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_PROVIDER)
      .useValue(paymentProvider)
      .compile();

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
      paymentProvider,
      auth: new AuthApi(app),
      orders: new OrdersApi(app),
      events: new EventsApi(app),
      ticketTiers: new TicketTiersApi(app),
    });
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  return context;
}
