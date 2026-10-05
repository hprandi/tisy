import type {
  PaymentConfirmationStatus,
  PaymentProvider,
  PaymentSession,
  PaymentStatusResult,
  StartPaymentData,
} from '../../src/payments/payment-provider.interface';

// Stands in for MercadoPagoProvider in e2e tests — never calls the real API.
// Configure `nextStatus`/`nextOrderId` before posting to the webhook endpoint.
export class FakePaymentProvider implements PaymentProvider {
  readonly providerName = 'fake';

  nextStatus: PaymentConfirmationStatus = 'approved';
  nextOrderId = '';

  startPayment(data: StartPaymentData): Promise<PaymentSession> {
    return Promise.resolve({
      externalId: 'fake-preference-id',
      checkoutUrl: `https://fake.checkout/${data.orderId}`,
    });
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  extractPaymentId(): string | null {
    return 'fake-payment-id';
  }

  getPaymentStatus(): Promise<PaymentStatusResult> {
    return Promise.resolve({
      status: this.nextStatus,
      orderId: this.nextOrderId,
    });
  }
}
