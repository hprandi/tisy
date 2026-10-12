import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { GuestBuyer } from '../builders';
import { toApiResult, type ApiResult } from './api-result';

export interface OrderItem {
  ticketTierId: string;
  quantity: number;
}

export interface CreatedOrder {
  id: string;
  buyerId: string;
  status: string;
  totalAmount: string;
  expiresAt: string;
}

export interface OrderView {
  id: string;
  status: string;
  event: {
    id: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
  };
  buyerName: string;
}

export interface TicketView {
  id: string;
  code: string;
  tierName: string;
  holderName: string | null;
  status: string;
}

export interface PaymentStart {
  checkoutUrl: string;
}

export class OrdersApi {
  constructor(private readonly app: INestApplication<App>) {}

  async createAsGuest(order: {
    eventId: string;
    buyer: GuestBuyer;
    items: OrderItem[];
  }): Promise<ApiResult<CreatedOrder>> {
    const response = await request(this.app.getHttpServer())
      .post('/orders')
      .send({
        eventId: order.eventId,
        buyerType: 'new',
        buyerInfo: {
          name: order.buyer.name,
          email: order.buyer.email,
          documentType: order.buyer.documentType,
          documentNumber: order.buyer.documentNumber,
        },
        items: order.items,
      });

    return toApiResult(response);
  }

  async startPayment(orderId: string): Promise<ApiResult<PaymentStart>> {
    const response = await request(this.app.getHttpServer()).post(
      `/orders/${orderId}/payment`,
    );

    return toApiResult(response);
  }

  async get(orderId: string): Promise<ApiResult<OrderView>> {
    const response = await request(this.app.getHttpServer()).get(
      `/orders/${orderId}`,
    );

    return toApiResult(response);
  }

  async tickets(orderId: string): Promise<ApiResult<TicketView[]>> {
    const response = await request(this.app.getHttpServer()).get(
      `/orders/${orderId}/tickets`,
    );

    return toApiResult(response);
  }

  async nameTicket(
    orderId: string,
    ticketId: string,
    holder: { holderName?: string; holderEmail?: string },
  ): Promise<ApiResult<TicketView>> {
    const response = await request(this.app.getHttpServer())
      .patch(`/orders/${orderId}/tickets/${ticketId}`)
      .send(holder);

    return toApiResult(response);
  }
}
