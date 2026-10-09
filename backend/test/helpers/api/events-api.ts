import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { NewEvent } from '../builders';
import { bearer, toApiResult, type ApiResult } from './api-result';
import type { TicketTierBody } from './ticket-tiers-api';

export interface EventBody {
  id: string;
  organizerId: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface EventDetails extends EventBody {
  ticketTiers: TicketTierBody[];
}

export class EventsApi {
  constructor(private readonly app: INestApplication<App>) {}

  async create(
    token: string | undefined,
    event: NewEvent,
  ): Promise<ApiResult<EventBody>> {
    const response = await request(this.app.getHttpServer())
      .post('/events')
      .set(bearer(token))
      .send(event);

    return toApiResult(response);
  }

  async list(token: string | undefined): Promise<ApiResult<EventBody[]>> {
    const response = await request(this.app.getHttpServer())
      .get('/events')
      .set(bearer(token));

    return toApiResult(response);
  }

  async get(id: string, token?: string): Promise<ApiResult<EventDetails>> {
    const response = await request(this.app.getHttpServer())
      .get(`/events/${id}`)
      .set(bearer(token));

    return toApiResult(response);
  }

  async update(
    token: string | undefined,
    id: string,
    changes: Partial<NewEvent>,
  ): Promise<ApiResult<EventBody>> {
    const response = await request(this.app.getHttpServer())
      .patch(`/events/${id}`)
      .set(bearer(token))
      .send(changes);

    return toApiResult(response);
  }

  async publish(
    token: string | undefined,
    id: string,
  ): Promise<ApiResult<EventBody>> {
    const response = await request(this.app.getHttpServer())
      .post(`/events/${id}/publish`)
      .set(bearer(token));

    return toApiResult(response);
  }
}
