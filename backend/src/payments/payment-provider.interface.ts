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

export interface PaymentProvider {
  startPayment(data: StartPaymentData): Promise<PaymentSession>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
