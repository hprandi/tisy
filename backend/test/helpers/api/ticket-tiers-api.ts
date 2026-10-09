import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { NewTicketTier } from '../builders';
import { bearer, toApiResult, type ApiResult } from './api-result';

export interface TicketTierBody {
  id: string;
  eventId: string;
  name: string;
  price: string;
  quantityTotal: number;
  quantityAvailable: number;
  status: string;
}

export class TicketTiersApi {
  constructor(private readonly app: INestApplication<App>) {}

  async create(
    token: string | undefined,
    eventId: string,
    tier: NewTicketTier,
  ): Promise<ApiResult<TicketTierBody>> {
    const response = await request(this.app.getHttpServer())
      .post(`/events/${eventId}/ticket-tiers`)
      .set(bearer(token))
      .send(tier);

    return toApiResult(response);
  }

  async list(
    token: string | undefined,
    eventId: string,
  ): Promise<ApiResult<TicketTierBody[]>> {
    const response = await request(this.app.getHttpServer())
      .get(`/events/${eventId}/ticket-tiers`)
      .set(bearer(token));

    return toApiResult(response);
  }

  async update(
    token: string | undefined,
    eventId: string,
    tierId: string,
    changes: Partial<NewTicketTier>,
  ): Promise<ApiResult<TicketTierBody>> {
    const response = await request(this.app.getHttpServer())
      .patch(`/events/${eventId}/ticket-tiers/${tierId}`)
      .set(bearer(token))
      .send(changes);

    return toApiResult(response);
  }
}
