import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Credentials, Person } from '../builders';
import { toApiResult, type ApiResult } from './api-result';

export interface AccessToken {
  accessToken: string;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  documentType: string;
  documentNumber: string;
  canOrganize: boolean;
  createdAt: string;
}

export class AuthApi {
  constructor(private readonly app: INestApplication<App>) {}

  async register(person: Person): Promise<ApiResult<AccessToken>> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({
        name: person.name,
        email: person.email,
        password: person.password,
        documentType: person.documentType,
        documentNumber: person.documentNumber,
      });

    return toApiResult(response);
  }

  async login(credentials: Credentials): Promise<ApiResult<AccessToken>> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    return toApiResult(response);
  }

  async me(token?: string): Promise<ApiResult<Account>> {
    const pending = request(this.app.getHttpServer()).get('/auth/me');
    if (token) {
      pending.set('Authorization', `Bearer ${token}`);
    }

    return toApiResult(await pending);
  }
}
