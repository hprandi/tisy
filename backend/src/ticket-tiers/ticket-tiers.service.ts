import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TicketTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTierDto } from './create-ticket-tier.dto';
import { UpdateTicketTierDto } from './update-ticket-tier.dto';

@Injectable()
export class TicketTiersService {
  constructor(private prisma: PrismaService) {}

  async create(
    eventId: string,
    createTicketTierDto: CreateTicketTierDto,
  ): Promise<TicketTier> {
    const salesStartAt = createTicketTierDto.salesStartAt
      ? new Date(createTicketTierDto.salesStartAt)
      : undefined;
    const salesEndAt = createTicketTierDto.salesEndAt
      ? new Date(createTicketTierDto.salesEndAt)
      : undefined;

    this.assertValidSalesWindow(salesStartAt, salesEndAt);

    return this.prisma.ticketTier.create({
      data: {
        eventId,
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
    updateTicketTierDto: UpdateTicketTierDto,
  ): Promise<TicketTier> {
    const salesStartAt = updateTicketTierDto.salesStartAt
      ? new Date(updateTicketTierDto.salesStartAt)
      : tier.salesStartAt;
    const salesEndAt = updateTicketTierDto.salesEndAt
      ? new Date(updateTicketTierDto.salesEndAt)
      : tier.salesEndAt;

    this.assertValidSalesWindow(salesStartAt, salesEndAt);

    return this.prisma.ticketTier.update({
      where: { id: tier.id },
      data: {
        ...updateTicketTierDto,
        salesStartAt,
        salesEndAt,
        // Orders don't exist yet, so nothing has decremented quantityAvailable
        // below quantityTotal — safe to mirror it here without a stock-aware merge.
        quantityAvailable:
          updateTicketTierDto.quantityTotal ?? tier.quantityAvailable,
      },
    });
  }

  private assertValidSalesWindow(
    salesStartAt?: Date | null,
    salesEndAt?: Date | null,
  ): void {
    if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) {
      throw new BadRequestException('salesEndAt must be after salesStartAt.');
    }
  }
}
