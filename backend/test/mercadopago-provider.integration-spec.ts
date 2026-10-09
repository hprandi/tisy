import { OrderStatus } from '@prisma/client';
import { checkoutHelpers } from './helpers/checkout-helpers';
import { seedEventOnSale } from './helpers/fixtures';
import { useTestAppWithMercadoPago } from './helpers/test-app';

describe('Mercado Pago provider (integration)', () => {
  // Runs the real MercadoPagoProvider, driven through the webhook endpoint, with only the
  // Mercado Pago HTTP API faked. The checkout tests replace the provider, so what we
  // assume about Mercado Pago (signature, payloads, statuses) is only checked here.
  const ctx = useTestAppWithMercadoPago();
  const { placeOrder, findOrder } = checkoutHelpers(ctx);

  async function aPendingOrder(): Promise<string> {
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);
    return order.body.id;
  }

  it('happy path: a signed approved notification marks the order PAID', async () => {
    // Given a pending order
    const orderId = await aPendingOrder();
    ctx.mercadoPago.reportsPayment({ id: '1001', status: 'approved', orderId });

    // When a correctly signed notification reports its payment approved
    const result = await ctx.webhook.notifyMercadoPago({ paymentId: '1001' });

    // Then the order is PAID
    const order = await findOrder(orderId);
    expect(result.status).toBe(200);
    expect(order.status).toBe(OrderStatus.PAID);
    expect(order.paymentExternalId).toBe('1001');
  });

  it('a notification with an invalid signature is rejected', async () => {
    // Given a pending order whose payment Mercado Pago would report approved
    const orderId = await aPendingOrder();
    ctx.mercadoPago.reportsPayment({ id: '1001', status: 'approved', orderId });

    // When a notification arrives with a wrong signature
    const result = await ctx.webhook.notifyMercadoPago({
      paymentId: '1001',
      signedWith: 'wrong-secret',
    });

    // Then 401 and the order stays PENDING
    expect(result.status).toBe(401);
    expect((await findOrder(orderId)).status).toBe(OrderStatus.PENDING);
  });

  it('notifications that are not about a payment are ignored', async () => {
    // Given a pending order whose payment Mercado Pago would report approved
    const orderId = await aPendingOrder();
    ctx.mercadoPago.reportsPayment({ id: '1001', status: 'approved', orderId });

    // When a signed notification of type merchant_order arrives
    const result = await ctx.webhook.notifyMercadoPago({
      paymentId: '1001',
      type: 'merchant_order',
    });

    // Then 200 and the order is untouched
    expect(result.status).toBe(200);
    expect((await findOrder(orderId)).status).toBe(OrderStatus.PENDING);
  });

  // Known bug, tracked in https://github.com/hprandi/tisy/issues/32: it answers 500 today and
  // the expected status is still to be decided. Enable it once that is fixed and tighten the status.
  // it('a payment unknown to Mercado Pago is not a 500', async () => {
  //   // Given a pending order
  //   const orderId = await aPendingOrder();
  //   ctx.mercadoPago.doesNotKnowPayment('1001');
  //
  //   // When a signed notification points to a payment Mercado Pago does not know
  //   const result = await ctx.webhook.notifyMercadoPago({ paymentId: '1001' });
  //
  //   // Then a handled error (not 500) and the order is untouched
  //   expect(result.status).not.toBe(500);
  //   expect((await findOrder(orderId)).status).toBe(OrderStatus.PENDING);
  // });

  // Known gap: refunded or charged_back on an already PAID order changes nothing today (to be decided)
  describe('payment statuses', () => {
    // Table: rejected | cancelled | refunded | charged_back -> CANCELLED
    //   | pending | in_process -> PENDING (approved is the happy path)
    it.each<[string, OrderStatus]>([
      ['rejected', OrderStatus.CANCELLED],
      ['cancelled', OrderStatus.CANCELLED],
      ['refunded', OrderStatus.CANCELLED],
      ['charged_back', OrderStatus.CANCELLED],
      ['pending', OrderStatus.PENDING],
      ['in_process', OrderStatus.PENDING],
    ])('a %s payment leaves the order %s', async (status, expected) => {
      // Given a pending order
      const orderId = await aPendingOrder();
      ctx.mercadoPago.reportsPayment({ id: '1001', status, orderId });

      // When Mercado Pago reports its payment with that status
      await ctx.webhook.notifyMercadoPago({ paymentId: '1001' });

      // Then the order ends in the state shown
      expect((await findOrder(orderId)).status).toBe(expected);
    });
  });
});
