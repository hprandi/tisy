import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
import { TicketsService } from '../tickets/tickets.service';
import type { PaymentConfirmationStatus } from './payment-provider.interface';

@Injectable()
export class PaymentStatusService {
  constructor(
    private prisma: PrismaService,
    private ticketTiersService: TicketTiersService,
    private ticketsService: TicketsService,
  ) {}

  async receivePaymentStatusUpdate(
    orderId: string,
    status: PaymentConfirmationStatus,
    paymentId: string,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    if (status === 'approved') {
      await this.markOrderPaid(orderId, paymentId);
    } else if (status === 'cancelled') {
      await this.cancelAndReleaseStock(orderId);
    }
    // 'pending' — no state change yet, wait for a later notification.
  }

  private async markOrderPaid(
    orderId: string,
    paymentId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paid = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING }, // WHERE status = PENDING guards against duplicate webhook deliveries
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
          // Overwrites the Preference id from startPayment() — Preference and Payment are different Mercado Pago ids.
          paymentExternalId: paymentId,
        },
      });

      // Same transaction as the PAID update: a paid order always has its tickets.
      if (paid.count === 0) {
        return;
      }
      await this.ticketsService.issueForOrder(tx, orderId); // TODO: Should this not be a colateral effect?
    });
  }

  private async cancelAndReleaseStock(orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });

      if (cancelled.count === 0) {
        return; // already handled by a previous notification
      }

      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await this.ticketTiersService.release(
          tx,
          item.ticketTierId,
          item.quantity,
        );
      }
    });
  }
}
