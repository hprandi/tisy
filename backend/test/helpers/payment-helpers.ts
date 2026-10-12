import type { PaymentConfirmationStatus } from '../../src/payments/payment-provider.interface';
import { aGuestBuyer, type GuestBuyer } from './builders';
import { seedEventOnSale } from './fixtures';
import type { TestContext } from './test-app';

// What the payment provider reports is configured on the fake provider, then the
// notification is delivered to the webhook.
export function paymentHelpers(ctx: TestContext) {
  const reportPayment = (
    orderId: string,
    status: PaymentConfirmationStatus,
  ) => {
    ctx.paymentProvider.nextOrderId = orderId;
    ctx.paymentProvider.nextStatus = status;

    return ctx.webhook.notify();
  };

  return {
    reportPayment,

    // An order of `quantity` tickets whose payment was approved. Pass `sale` to
    // buy from an event that already exists.
    aPaidOrder: async (
      quantity: number,
      sale?: { eventId: string; tierId: string },
    ): Promise<{ orderId: string; eventId: string; buyer: GuestBuyer }> => {
      const { eventId, tierId } = sale ?? (await seedEventOnSale(ctx.prisma));
      const buyer = aGuestBuyer();
      const order = await ctx.orders.createAsGuest({
        eventId,
        buyer,
        items: [{ ticketTierId: tierId, quantity }],
      });
      await reportPayment(order.body.id, 'approved');

      return { orderId: order.body.id, eventId, buyer };
    },
  };
}
