import type { PaymentConfirmationStatus } from '../../src/payments/payment-provider.interface';
import type { TestContext } from './test-app';

// What the payment provider reports is configured on the fake provider, then the
// notification is delivered to the webhook.
export function paymentHelpers(ctx: TestContext) {
  return {
    reportPayment: (orderId: string, status: PaymentConfirmationStatus) => {
      ctx.paymentProvider.nextOrderId = orderId;
      ctx.paymentProvider.nextStatus = status;

      return ctx.webhook.notify();
    },
  };
}
