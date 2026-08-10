import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Event, TicketTier } from '@prisma/client';
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
