import { randomUUID } from 'crypto';
import { TicketStatus } from '@prisma/client';
import { checkoutHelpers } from './helpers/checkout-helpers';
import {
  anOrganizer,
  seedEventOnSale,
  type Organizer,
} from './helpers/fixtures';
import { paymentHelpers } from './helpers/payment-helpers';
import { useTestApp } from './helpers/test-app';

describe('Check-in (integration)', () => {
  const ctx = useTestApp();
  const { ticketsOf } = checkoutHelpers(ctx);
  const { aPaidOrder } = paymentHelpers(ctx);

  async function anEventOf(organizer: Organizer) {
    return seedEventOnSale(ctx.prisma, { organizerId: organizer.id });
  }

  // A ticket of the organizer's event, bought and named after `holderName`.
  // Pass `holderName: null` to leave it ISSUED.
  async function aTicketAtTheDoor(holderName: string | null = 'Ana') {
    const organizer = await anOrganizer(ctx);
    const sale = await anEventOf(organizer);
    const { orderId } = await aPaidOrder(1, sale);
    const [ticket] = await ticketsOf(orderId);
    if (holderName) {
      await ctx.orders.nameTicket(orderId, ticket.id, { holderName });
    }

    return { organizer, eventId: sale.eventId, ticket };
  }

  const ticketByCode = (code: string) =>
    ctx.prisma.ticket.findUniqueOrThrow({ where: { code } });

  it('happy path: a named ticket checks in', async () => {
    // Given a ticket named after Ana
    const { organizer, eventId, ticket } = await aTicketAtTheDoor('Ana');

    // When the organizer scans its code
    const result = await ctx.checkIn.scan(organizer.token, eventId, {
      code: ticket.code,
    });

    // Then 200 with the holder and the tier, and the ticket is CHECKED_IN
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      holderName: 'Ana',
      tierName: 'General',
    });
    const saved = await ticketByCode(ticket.code);
    expect(saved.status).toBe(TicketStatus.CHECKED_IN);
    expect(saved.checkedInAt?.toISOString()).toBe(result.body.checkedInAt);
  });

  it('a ticket checks in only once', async () => {
    // Given a ticket already checked in
    const { organizer, eventId, ticket } = await aTicketAtTheDoor();
    const first = await ctx.checkIn.scan(organizer.token, eventId, {
      code: ticket.code,
    });

    // When it is scanned again
    const again = await ctx.checkIn.scan(organizer.token, eventId, {
      code: ticket.code,
    });

    // Then 409 telling when it first checked in, and that time does not change
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({
      ticketStatus: TicketStatus.CHECKED_IN,
      checkedInAt: first.body.checkedInAt,
    });
    const saved = await ticketByCode(ticket.code);
    expect(saved.checkedInAt?.toISOString()).toBe(first.body.checkedInAt);
  });

  it('scanning the same ticket twice at once checks it in only once', async () => {
    // Given a named ticket
    const { organizer, eventId, ticket } = await aTicketAtTheDoor();

    // When two doors scan it at the same time
    const results = await Promise.all([
      ctx.checkIn.scan(organizer.token, eventId, { code: ticket.code }),
      ctx.checkIn.scan(organizer.token, eventId, { code: ticket.code }),
    ]);

    // Then exactly one succeeds and the other gets 409
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });

  it('a ticket without a holder does not check in', async () => {
    // Given an ISSUED ticket, never named
    const { organizer, eventId, ticket } = await aTicketAtTheDoor(null);

    // When the organizer scans its code
    const result = await ctx.checkIn.scan(organizer.token, eventId, {
      code: ticket.code,
    });

    // Then 409 saying it is ISSUED, and it stays ISSUED
    expect(result.status).toBe(409);
    expect(result.body.ticketStatus).toBe(TicketStatus.ISSUED);
    const saved = await ticketByCode(ticket.code);
    expect(saved.status).toBe(TicketStatus.ISSUED);
  });

  it('surrounding spaces in a typed code are ignored', async () => {
    // Given a named ticket
    const { organizer, eventId, ticket } = await aTicketAtTheDoor();

    // When its code is typed with spaces around it
    const result = await ctx.checkIn.scan(organizer.token, eventId, {
      code: `  ${ticket.code} `,
    });

    // Then it checks in
    expect(result.status).toBe(200);
  });

  describe('a ticket only checks in at its own event, by its organizer', () => {
    // Table: a ticket of another event of the same organizer | an unknown code | another organizer's event
    it.each<
      [
        string,
        (door: {
          organizer: Organizer;
          eventId: string;
          code: string;
        }) => Promise<{ token: string; eventId: string; code: string }>,
      ]
    >([
      [
        'a ticket of another event',
        async ({ organizer, code }) => {
          const otherEvent = await anEventOf(organizer);
          return { token: organizer.token, eventId: otherEvent.eventId, code };
        },
      ],
      [
        'an unknown code',
        ({ organizer, eventId }) =>
          Promise.resolve({
            token: organizer.token,
            eventId,
            code: randomUUID(),
          }),
      ],
      [
        "another organizer's event",
        async ({ eventId, code }) => {
          const stranger = await anOrganizer(ctx);
          return { token: stranger.token, eventId, code };
        },
      ],
    ])('%s is 404', async (_case, scanFrom) => {
      // Given a named ticket of an organizer's event
      const { organizer, eventId, ticket } = await aTicketAtTheDoor();

      // When it is scanned from that situation
      const target = await scanFrom({ organizer, eventId, code: ticket.code });
      const result = await ctx.checkIn.scan(target.token, target.eventId, {
        code: target.code,
      });

      // Then 404 and the ticket is still READY
      expect(result.status).toBe(404);
      const saved = await ticketByCode(ticket.code);
      expect(saved.status).toBe(TicketStatus.READY);
    });
  });

  it('requires authentication', async () => {
    // Given a named ticket
    const { eventId, ticket } = await aTicketAtTheDoor();

    // When it is scanned without a token
    const result = await ctx.checkIn.scan(undefined, eventId, {
      code: ticket.code,
    });

    // Then 401
    expect(result.status).toBe(401);
  });

  it('requires a code', async () => {
    // Given an organizer's event
    const organizer = await anOrganizer(ctx);
    const { eventId } = await anEventOf(organizer);

    // When the scan has no code
    const result = await ctx.checkIn.scan(organizer.token, eventId, {});

    // Then 400
    expect(result.status).toBe(400);
  });
});
