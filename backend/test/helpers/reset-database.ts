import type { PrismaService } from '../../src/prisma/prisma.service';

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "tickets", "order_items", "orders", "ticket_tiers", "events", "users" CASCADE;',
  );
}
