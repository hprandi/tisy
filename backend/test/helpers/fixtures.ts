import { DocumentType, EventStatus } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';

export const HOUR_IN_MS = 60 * 60 * 1000;

// A buyer created by a guest checkout: an account without a password.
export async function createGuestAccount(
  prisma: PrismaService,
): Promise<{ email: string }> {
  const guest = await prisma.user.create({
    data: {
      name: 'Guest Buyer',
      email: 'guest@test.com',
      documentType: DocumentType.CPF,
      documentNumber: '98765432100',
    },
  });

  return { email: guest.email };
}

export function countAccounts(prisma: PrismaService): Promise<number> {
  return prisma.user.count();
}

// A published event with one open tier of 10 tickets, built straight in the
// database so tests do not depend on the organizer's endpoints.
export async function seedEventOnSale(
  prisma: PrismaService,
): Promise<{ eventId: string; tierId: string }> {
  const event = await prisma.event.create({
    data: {
      title: 'Seeded Event',
      location: 'Test Venue',
      startDate: new Date(Date.now() + 24 * HOUR_IN_MS),
      endDate: new Date(Date.now() + 48 * HOUR_IN_MS),
      status: EventStatus.PUBLISHED,
      organizer: {
        create: {
          name: 'Seeded Organizer',
          email: 'organizer@test.com',
          documentType: DocumentType.CPF,
          documentNumber: '12345678901',
        },
      },
      ticketTiers: {
        create: {
          name: 'General',
          currency: 'BRL',
          price: 50,
          quantityTotal: 10,
          quantityAvailable: 10,
          salesStartAt: new Date(Date.now() - HOUR_IN_MS),
          salesEndAt: new Date(Date.now() + 24 * HOUR_IN_MS),
        },
      },
    },
    include: { ticketTiers: true },
  });

  return { eventId: event.id, tierId: event.ticketTiers[0].id };
}
