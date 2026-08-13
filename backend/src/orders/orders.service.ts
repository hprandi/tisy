import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  Prisma,
  TicketTierStatus,
  type Event,
  type Order,
  type TicketTier,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BuyerType, CreateOrderDto } from './create-order.dto';
import { CreateOrderItemDto } from './create-order-item.dto';

const RESERVATION_WINDOW_MINUTES = 15;

interface ReservedOrderItem {
  ticketTierId: string;
  currency: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async create(
    eventId: string,
    createOrderDto: CreateOrderDto,
    viewerId?: string,
  ): Promise<Order> {
    const buyerId = await this.resolveBuyerId(createOrderDto, viewerId);
    const event = await this.findPublishedEvent(eventId);

    return this.prisma.$transaction(async (tx) => {
      const reservedItems = await this.reserveItems(
        tx,
        event.id,
        createOrderDto.items,
      );

      return tx.order.create({
        data: {
          eventId: event.id,
          buyerId,
          currency: 'BRL',
          totalAmount: this.calculateTotal(reservedItems),
          expiresAt: this.buildExpiresAt(),
          orderItems: { createMany: { data: reservedItems } },
        },
        include: { orderItems: true },
      });
    });
  }

  private async resolveBuyerId(
    createOrderDto: CreateOrderDto,
    viewerId?: string,
  ): Promise<string> {
    if (createOrderDto.buyerType === BuyerType.ME) {
      if (!viewerId) {
        throw new BadRequestException(
          'buyerType "me" requires authentication.',
        );
      }
      return viewerId;
    }

    const buyerInfo = createOrderDto.buyerInfo!;
    const buyer = await this.usersService.findOrCreateBuyer(
      buyerInfo.name,
      buyerInfo.email,
      buyerInfo.documentType,
      buyerInfo.documentNumber,
    );
    return buyer.id;
  }

  private async findPublishedEvent(eventId: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Event is not open for orders.');
    }

    return event;
  }

  private async reserveItems(
    tx: Prisma.TransactionClient,
    eventId: string,
    items: CreateOrderItemDto[],
  ): Promise<ReservedOrderItem[]> {
    const reservedItems: ReservedOrderItem[] = [];

    for (const item of items) {
      reservedItems.push(await this.reserveItem(tx, eventId, item));
    }

    return reservedItems;
  }

  private async reserveItem(
    tx: Prisma.TransactionClient,
    eventId: string,
    item: CreateOrderItemDto,
  ): Promise<ReservedOrderItem> {
    const tier = await this.findTierInEvent(tx, eventId, item.ticketTierId);
    this.assertTierIsPurchasable(tier);

    const decrement = await tx.ticketTier.updateMany({
      where: { id: tier.id, quantityAvailable: { gte: item.quantity } },
      data: { quantityAvailable: { decrement: item.quantity } },
    });

    if (decrement.count === 0) {
      throw new ConflictException(
        `Not enough tickets available for tier "${tier.name}".`,
      );
    }

    return {
      ticketTierId: tier.id,
      currency: 'BRL',
      unitPrice: tier.price,
      quantity: item.quantity,
    };
  }

  private async findTierInEvent(
    tx: Prisma.TransactionClient,
    eventId: string,
    ticketTierId: string,
  ): Promise<TicketTier> {
    const tier = await tx.ticketTier.findUnique({
      where: { id: ticketTierId },
    });

    if (!tier || tier.eventId !== eventId) {
      throw new NotFoundException(
        `Ticket tier ${ticketTierId} not found in this event.`,
      );
    }

    return tier;
  }

  private assertTierIsPurchasable(tier: TicketTier): void {
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

  private calculateTotal(items: ReservedOrderItem[]): Prisma.Decimal {
    return items.reduce(
      (total, item) => total.add(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );
  }

  private buildExpiresAt(): Date {
    return new Date(Date.now() + RESERVATION_WINDOW_MINUTES * 60 * 1000);
  }
}
