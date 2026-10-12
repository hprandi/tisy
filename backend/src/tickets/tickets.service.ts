import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NameTicketDto } from './name-ticket.dto';

export interface TicketView {
  id: string;
  code: string;
  tierName: string;
  holderName: string | null;
  status: TicketStatus;
}

const TICKET_VIEW_INCLUDE = {
  orderItem: { select: { ticketTier: { select: { name: true } } } },
} satisfies Prisma.TicketInclude;

type TicketWithTier = Prisma.TicketGetPayload<{
  include: typeof TICKET_VIEW_INCLUDE;
}>;

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async issueForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({ where: { orderId } });

    const tickets = items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        orderItemId: item.id,
        code: this.generateCode(),
      })),
    );

    await tx.ticket.createMany({ data: tickets });
  }

  async listForOrder(orderId: string): Promise<TicketView[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { orderItem: { orderId } },
      include: TICKET_VIEW_INCLUDE,
      orderBy: [{ orderItemId: 'asc' }, { id: 'asc' }],
    });

    return tickets.map((ticket) => this.toView(ticket));
  }

  async name(
    orderId: string,
    ticketId: string,
    holder: NameTicketDto,
  ): Promise<TicketView> {
    const named = await this.prisma.ticket.updateMany({
      where: {
        id: ticketId,
        orderItem: { orderId },
        status: TicketStatus.ISSUED,
      },
      data: {
        holderName: holder.holderName,
        holderEmail: holder.holderEmail,
        status: TicketStatus.READY,
      },
    });

    if (named.count === 0) {
      await this.rejectNaming(orderId, ticketId);
    }

    const ticket = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: TICKET_VIEW_INCLUDE,
    });

    return this.toView(ticket);
  }

  private async rejectNaming(
    orderId: string,
    ticketId: string,
  ): Promise<never> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orderItem: { orderId } },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    throw new ConflictException('Ticket already has a holder.');
  }

  private toView(ticket: TicketWithTier): TicketView {
    return {
      id: ticket.id,
      code: ticket.code,
      tierName: ticket.orderItem.ticketTier.name,
      holderName: ticket.holderName,
      status: ticket.status,
    };
  }

  private generateCode(): string {
    return randomBytes(16).toString('base64url');
  }
}
