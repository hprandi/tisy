import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class TicketsService {
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

  private generateCode(): string {
    return randomBytes(16).toString('base64url');
  }
}
