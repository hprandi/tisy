import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FAKE_PAYMENT_ID } from '../fake-payment-provider';
import { signNotification } from '../mercadopago-signature';
import { toApiResult, type ApiResult } from './api-result';

export class PaymentWebhookApi {
  constructor(private readonly app: INestApplication<App>) {}

  // For tests that replace the payment provider: what the provider reports is
  // configured on the fake provider; this only delivers the notification.
  async notify(): Promise<ApiResult<{ received: boolean }>> {
    const response = await request(this.app.getHttpServer())
      .post(`/payments/webhook/mercadopago?data.id=${FAKE_PAYMENT_ID}`)
      .send({ type: 'payment', data: { id: FAKE_PAYMENT_ID } });

    return toApiResult(response);
  }

  // A notification shaped and signed the way Mercado Pago sends it.
  async notifyMercadoPago(notification: {
    paymentId: string;
    type?: string;
    signedWith?: string;
  }): Promise<ApiResult<{ received: boolean }>> {
    const requestId = randomUUID();
    const signature = signNotification({
      dataId: notification.paymentId,
      requestId,
      secret:
        notification.signedWith ?? process.env.MERCADOPAGO_WEBHOOK_SECRET!,
    });

    const response = await request(this.app.getHttpServer())
      .post(`/payments/webhook/mercadopago?data.id=${notification.paymentId}`)
      .set({ 'x-signature': signature, 'x-request-id': requestId })
      .send({
        type: notification.type ?? 'payment',
        data: { id: notification.paymentId },
      });

    return toApiResult(response);
  }
}
