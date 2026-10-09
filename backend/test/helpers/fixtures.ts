import { DocumentType, EventStatus } from '@prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { AuthApi } from './api/auth-api';
import { aPerson } from './builders';

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

// An event on sale with one open tier of 10 tickets, built straight in the
// database so tests do not depend on the organizer's endpoints. The overrides
// describe how it differs from that default.
export interface SaleOverrides {
  tickets?: number;
  eventStatus?: EventStatus;
  salesStartAt?: Date;
  salesEndAt?: Date;
}

export async function seedEventOnSale(
  prisma: PrismaService,
  overrides: SaleOverrides = {},
): Promise<{ eventId: string; tierId: string }> {
  const event = await prisma.event.create({
    data: {
      title: 'Seeded Event',
      location: 'Test Venue',
      startDate: new Date(Date.now() + 24 * HOUR_IN_MS),
      endDate: new Date(Date.now() + 48 * HOUR_IN_MS),
      status: overrides.eventStatus ?? EventStatus.PUBLISHED,
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
          quantityTotal: overrides.tickets ?? 10,
          quantityAvailable: overrides.tickets ?? 10,
          salesStartAt:
            overrides.salesStartAt ?? new Date(Date.now() - HOUR_IN_MS),
          salesEndAt:
            overrides.salesEndAt ?? new Date(Date.now() + 24 * HOUR_IN_MS),
        },
      },
    },
    include: { ticketTiers: true },
  });

  return { eventId: event.id, tierId: event.ticketTiers[0].id };
}

export interface Organizer {
  id: string;
  token: string;
}

// An account that can own events: registered through the API so it has a token.
export async function anOrganizer(auth: AuthApi): Promise<Organizer> {
  const registration = await auth.register(aPerson());
  const token = registration.body.accessToken;
  const me = await auth.me(token);

  return { id: me.body.id, token };
}

export async function seedEvent(
  prisma: PrismaService,
  organizerId: string,
  status: EventStatus = EventStatus.DRAFT,
): Promise<string> {
  const event = await prisma.event.create({
    data: {
      organizerId,
      title: 'Seeded Event',
      location: 'Test Venue',
      startDate: new Date(Date.now() + 24 * HOUR_IN_MS),
      endDate: new Date(Date.now() + 48 * HOUR_IN_MS),
      status,
    },
  });

  return event.id;
}

// A tier whose sales have not opened yet, like one just created through the API.
export async function seedTicketTier(
  prisma: PrismaService,
  eventId: string,
): Promise<string> {
  const tier = await prisma.ticketTier.create({
    data: {
      eventId,
      name: 'General',
      currency: 'BRL',
      price: 50,
      quantityTotal: 10,
      quantityAvailable: 10,
      salesStartAt: new Date(Date.now() + HOUR_IN_MS),
      salesEndAt: new Date(Date.now() + 24 * HOUR_IN_MS),
    },
  });

  return tier.id;
}

export function countEvents(prisma: PrismaService): Promise<number> {
  return prisma.event.count();
}

export function countTicketTiers(prisma: PrismaService): Promise<number> {
  return prisma.ticketTier.count();
}
