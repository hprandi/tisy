import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TicketTierStatus,
  type Event,
  type TicketTier,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTierDto } from './create-ticket-tier.dto';
import { UpdateTicketTierDto } from './update-ticket-tier.dto';

@Injectable()
export class TicketTiersService {
  constructor(private prisma: PrismaService) {}

  async create(
    event: Event,
    createTicketTierDto: CreateTicketTierDto,
  ): Promise<TicketTier> {
    const salesStartAt = new Date(createTicketTierDto.salesStartAt);
    const salesEndAt = new Date(createTicketTierDto.salesEndAt);

    this.assertValidSalesWindow(salesStartAt, salesEndAt, event.endDate);

    return this.prisma.ticketTier.create({
      data: {
        eventId: event.id,
        name: createTicketTierDto.name,
        currency: 'BRL',
        price: createTicketTierDto.price,
        quantityTotal: createTicketTierDto.quantityTotal,
        quantityAvailable: createTicketTierDto.quantityTotal,
        salesStartAt,
        salesEndAt,
      },
    });
  }

  async findAllByEvent(eventId: string): Promise<TicketTier[]> {
    return this.prisma.ticketTier.findMany({ where: { eventId } });
  }

  async findByIdInEvent(id: string, eventId: string): Promise<TicketTier> {
    const tier = await this.prisma.ticketTier.findUnique({ where: { id } });

    if (!tier || tier.eventId !== eventId) {
      throw new NotFoundException('Ticket tier not found.');
    }

    return tier;
  }

  async update(
    tier: TicketTier,
    event: Event,
    updateTicketTierDto: UpdateTicketTierDto,
  ): Promise<TicketTier> {
    const salesStartAt = updateTicketTierDto.salesStartAt
      ? new Date(updateTicketTierDto.salesStartAt)
      : tier.salesStartAt;
    const salesEndAt = updateTicketTierDto.salesEndAt
      ? new Date(updateTicketTierDto.salesEndAt)
      : tier.salesEndAt;

    this.assertValidSalesWindow(salesStartAt, salesEndAt, event.endDate);

    return this.prisma.ticketTier.update({
      where: { id: tier.id },
      data: {
        ...updateTicketTierDto,
        salesStartAt,
        salesEndAt,
      },
    });
  }

  // Decrements quantityAvailable atomically (WHERE quantityAvailable >= quantity)
  // so two concurrent reservations can never oversell the same tier. Takes the
  // caller's own transaction client so this participates in whatever larger
  // operation is reserving stock (e.g. order creation) — a failure elsewhere
  // in that transaction rolls the reservation back too.
  async reserve(
    tx: Prisma.TransactionClient,
    eventId: string,
    ticketTierId: string,
    quantity: number,
  ): Promise<TicketTier> {
    const tier = await tx.ticketTier.findUnique({
      where: { id: ticketTierId },
    });

    if (!tier || tier.eventId !== eventId) {
      throw new NotFoundException(
        `Ticket tier ${ticketTierId} not found in this event.`,
      );
    }
    this.assertPurchasable(tier);

    const decrement = await tx.ticketTier.updateMany({
      where: { id: tier.id, quantityAvailable: { gte: quantity } },
      data: { quantityAvailable: { decrement: quantity } },
    });

    if (decrement.count === 0) {
      throw new ConflictException(
        `Not enough tickets available for tier "${tier.name}".`,
      );
    }

    return tier;
  }

  // The reverse of reserve() — gives quantity back (e.g. a payment failed
  // after stock was already reserved). No purchasability check: releasing
  // stock should always succeed regardless of the tier's current status.
  async release(
    tx: Prisma.TransactionClient,
    ticketTierId: string,
    quantity: number,
  ): Promise<void> {
    await tx.ticketTier.update({
      where: { id: ticketTierId },
      data: { quantityAvailable: { increment: quantity } },
    });
  }

  private assertPurchasable(tier: TicketTier): void {
    const now = new Date();

    if (tier.status !== TicketTierStatus.ACTIVE) {
      throw new BadRequestException(
        `Ticket tier "${tier.name}" is not available for purchase.`,
      );
    }
    if (now < tier.salesStartAt || now > tier.salesEndAt) {
      throw new BadRequestException(
        `Ticket tier "${tier.name}" is outside its sales window.`,
      );
    }
  }

  private assertValidSalesWindow(
    salesStartAt: Date,
    salesEndAt: Date,
    eventEndDate: Date,
  ): void {
    if (salesEndAt <= salesStartAt) {
      throw new BadRequestException('salesEndAt must be after salesStartAt.');
    }
    if (salesStartAt < new Date()) {
      throw new BadRequestException(
        'salesStartAt must be in the present or future.',
      );
    }
    if (salesEndAt > eventEndDate) {
      throw new BadRequestException(
        'salesEndAt must not be after the event end date.',
      );
    }
  }
}
