import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  OrderStatus,
  Prisma,
  type Event,
  type Order,
} from '@prisma/client';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type StartPaymentData,
} from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TicketTiersService } from '../ticket-tiers/ticket-tiers.service';
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

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { orderItems: { include: { ticketTier: true } } };
}>;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private ticketTiersService: TicketTiersService,
    @Inject(PAYMENT_PROVIDER) private paymentProvider: PaymentProvider,
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

  async startPayment(orderId: string): Promise<{ checkoutUrl: string }> {
    const order = await this.findPendingOrder(orderId);

    if (order.paymentCheckoutUrl) {
      return { checkoutUrl: order.paymentCheckoutUrl };
    }

    const session = await this.paymentProvider.startPayment(
      this.toStartPaymentData(order),
    );

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: this.paymentProvider.providerName,
        paymentExternalId: session.externalId,
        paymentCheckoutUrl: session.checkoutUrl,
      },
    });

    return { checkoutUrl: session.checkoutUrl };
  }

  private toStartPaymentData(order: OrderWithItems): StartPaymentData {
    return {
      orderId: order.id,
      items: order.orderItems.map((item) => ({
        ticketTierId: item.ticketTierId,
        ticketTierName: item.ticketTier.name,
        unitPrice: item.unitPrice.toString(),
        currency: item.currency,
        quantity: item.quantity,
      })),
    };
  }

  private async findPendingOrder(id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { ticketTier: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('Order is not pending payment.');
    }
    if (order.expiresAt < new Date()) {
      throw new ConflictException('Order has expired.');
    }

    return order;
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
    const tier = await this.ticketTiersService.reserve(
      tx,
      eventId,
      item.ticketTierId,
      item.quantity,
    );

    return {
      ticketTierId: tier.id,
      currency: 'BRL',
      unitPrice: tier.price,
      quantity: item.quantity,
    };
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
