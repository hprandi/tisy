import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FAKE_PAYMENT_ID } from '../fake-payment-provider';
import { toApiResult, type ApiResult } from './api-result';

export class PaymentWebhookApi {
  constructor(private readonly app: INestApplication<App>) {}

  // What the payment provider reports is configured on the fake provider;
  // this only delivers the notification.
  async notify(): Promise<ApiResult<{ received: boolean }>> {
    const response = await request(this.app.getHttpServer())
      .post(`/payments/webhook/mercadopago?data.id=${FAKE_PAYMENT_ID}`)
      .send({ type: 'payment', data: { id: FAKE_PAYMENT_ID } });

    return toApiResult(response);
  }
}
