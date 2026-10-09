import type {
  PaymentConfirmationStatus,
  PaymentProvider,
  PaymentSession,
  PaymentStatusResult,
  StartPaymentData,
} from '../../src/payments/payment-provider.interface';

export const FAKE_PAYMENT_ID = 'fake-payment-id';

// Stands in for MercadoPagoProvider in integration tests — never calls the real API.
// Configure `nextStatus`/`nextOrderId` before posting to the webhook endpoint.
export class FakePaymentProvider implements PaymentProvider {
  readonly providerName = 'fake';

  nextStatus: PaymentConfirmationStatus = 'approved';
  nextOrderId = '';
  startPaymentCalls = 0;

  reset(): void {
    this.nextStatus = 'approved';
    this.nextOrderId = '';
    this.startPaymentCalls = 0;
  }

  startPayment(data: StartPaymentData): Promise<PaymentSession> {
    this.startPaymentCalls += 1;
    return Promise.resolve({
      externalId: 'fake-preference-id',
      checkoutUrl: `https://fake.checkout/${data.orderId}`,
    });
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  extractPaymentId(): string | null {
    return FAKE_PAYMENT_ID;
  }

  getPaymentStatus(): Promise<PaymentStatusResult> {
    return Promise.resolve({
      status: this.nextStatus,
      orderId: this.nextOrderId,
    });
  }
}
