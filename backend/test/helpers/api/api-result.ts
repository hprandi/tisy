import type { Response } from 'supertest';

export interface ApiResult<T> {
  status: number;
  body: T;
}

export function toApiResult<T>(response: Response): ApiResult<T> {
  return { status: response.status, body: response.body as T };
}
