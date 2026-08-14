export interface StartPaymentItem {
  ticketTierId: string;
  ticketTierName: string;
  unitPrice: string;
  currency: string;
  quantity: number;
}

export interface StartPaymentData {
  orderId: string;
  items: StartPaymentItem[];
}

export interface PaymentSession {
  externalId: string;
  checkoutUrl: string;
}

// `cancelled` covers rejected, refunded and charged-back alike: in every
// case we stop expecting money and release the reserved stock.
export type PaymentConfirmationStatus = 'approved' | 'pending' | 'cancelled';

export interface PaymentStatusResult {
  status: PaymentConfirmationStatus;
  // Echoed back unchanged from the `external_reference` sent in
  // startPayment() — not looked up, this IS our order.id.
  orderId: string;
}

export interface WebhookNotification {
  signature: string | string[] | undefined; // `x-signature` header
  requestId: string | string[] | undefined; // `x-request-id` header
  resourceId: string | string[] | undefined; // `data.id` query param
  body: unknown;
}

export interface PaymentProvider {
  readonly providerName: string;
  startPayment(data: StartPaymentData): Promise<PaymentSession>;
  verifyWebhookSignature(notification: WebhookNotification): boolean;
  extractPaymentId(notification: WebhookNotification): string | null;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
