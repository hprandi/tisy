import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { bearer, toApiResult, type ApiResult } from './api-result';

export interface CheckInBody {
  holderName?: string;
  tierName?: string;
  checkedInAt?: string;
  ticketStatus?: string;
}

export class CheckInApi {
  constructor(private readonly app: INestApplication<App>) {}

  async scan(
    token: string | undefined,
    eventId: string,
    body: { code?: string },
  ): Promise<ApiResult<CheckInBody>> {
    const response = await request(this.app.getHttpServer())
      .post(`/events/${eventId}/check-in`)
      .set(bearer(token))
      .send(body);

    return toApiResult(response);
  }
}
