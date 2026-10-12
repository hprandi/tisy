import { randomUUID } from 'crypto';
import { OrderStatus, TicketStatus } from '@prisma/client';
import { checkoutHelpers } from './helpers/checkout-helpers';
import { seedEventOnSale } from './helpers/fixtures';
import { paymentHelpers } from './helpers/payment-helpers';
import { useTestApp } from './helpers/test-app';

describe('Order tickets (integration)', () => {
  const ctx = useTestApp();
  const { placeOrder, ticketsOf } = checkoutHelpers(ctx);
  const { aPaidOrder, reportPayment } = paymentHelpers(ctx);

  async function anIssuedTicket() {
    const { orderId } = await aPaidOrder(1);
    const [ticket] = await ticketsOf(orderId);

    return { orderId, ticketId: ticket.id };
  }

  it('happy path: the buyer sees the order and names a ticket', async () => {
    // Given a paid order of 2 tickets
    const { orderId, eventId, buyer } = await aPaidOrder(2);

    // When the buyer views the order, lists its tickets, names the first one and lists them again
    const order = await ctx.orders.get(orderId);
    const before = await ctx.orders.tickets(orderId);
    const first = before.body[0];
    await ctx.orders.nameTicket(orderId, first.id, { holderName: 'Ana' });
    const after = await ctx.orders.tickets(orderId);

    // Then the order shows PAID with the event summary and the buyer's name, the first list has
    //   2 tickets ISSUED without holder, and after naming that ticket is READY with its holder
    //   while the other is still ISSUED
    expect(order.body).toMatchObject({
      status: OrderStatus.PAID,
      buyerName: buyer.name,
      event: { id: eventId, title: 'Seeded Event', location: 'Test Venue' },
    });
    expect(before.body).toHaveLength(2);
    for (const ticket of before.body) {
      expect(ticket).toMatchObject({
        status: TicketStatus.ISSUED,
        holderName: null,
      });
    }
    expect(after.body.find((ticket) => ticket.id === first.id)).toMatchObject({
      status: TicketStatus.READY,
      holderName: 'Ana',
    });
    expect(
      after.body.filter((ticket) => ticket.status === TicketStatus.ISSUED),
    ).toHaveLength(1);
  });

  it('naming a ticket saves the holder', async () => {
    // Given an ISSUED ticket
    const { orderId, ticketId } = await anIssuedTicket();

    // When the buyer names it with a holder name and an email
    const result = await ctx.orders.nameTicket(orderId, ticketId, {
      holderName: 'Ana',
      holderEmail: 'ana@test.com',
    });

    // Then it is READY and both are saved
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: TicketStatus.READY,
      holderName: 'Ana',
    });
    const [saved] = await ticketsOf(orderId);
    expect(saved).toMatchObject({
      holderName: 'Ana',
      holderEmail: 'ana@test.com',
    });
  });

  it('the holder email is optional', async () => {
    // Given an ISSUED ticket
    const { orderId, ticketId } = await anIssuedTicket();

    // When the buyer names it with only a holder name
    const result = await ctx.orders.nameTicket(orderId, ticketId, {
      holderName: 'Ana',
    });

    // Then it is READY
    expect(result.status).toBe(200);
    expect(result.body.status).toBe(TicketStatus.READY);
  });

  it('a ticket can only be named once', async () => {
    // Given a READY ticket
    const { orderId, ticketId } = await anIssuedTicket();
    await ctx.orders.nameTicket(orderId, ticketId, { holderName: 'Ana' });

    // When the buyer names it again
    const again = await ctx.orders.nameTicket(orderId, ticketId, {
      holderName: 'Bia',
    });

    // Then 409 and the holder does not change
    expect(again.status).toBe(409);
    const [ticket] = await ticketsOf(orderId);
    expect(ticket.holderName).toBe('Ana');
  });

  it('naming the same ticket twice at once names it only once', async () => {
    // Given an ISSUED ticket
    const { orderId, ticketId } = await anIssuedTicket();

    // When two requests name it at the same time
    const results = await Promise.all([
      ctx.orders.nameTicket(orderId, ticketId, { holderName: 'Ana' }),
      ctx.orders.nameTicket(orderId, ticketId, { holderName: 'Bia' }),
    ]);

    // Then exactly one succeeds and the other gets 409
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });

  describe('a ticket is only named through its own order', () => {
    // Table: a ticket of another order | an unknown ticket | an unknown order
    it.each<[string, (own: string, other: string, ticket: string) => string[]]>(
      [
        ['a ticket of another order', (own, _other, ticket) => [own, ticket]],
        ['an unknown ticket', (own) => [own, randomUUID()]],
        ['an unknown order', (_own, _other, ticket) => [randomUUID(), ticket]],
      ],
    )('%s is 404', async (_case, target) => {
      // Given two paid orders of the same event, and a ticket of the second one
      const sale = await seedEventOnSale(ctx.prisma);
      const own = await aPaidOrder(1, sale);
      const other = await aPaidOrder(1, sale);
      const [otherTicket] = await ticketsOf(other.orderId);

      // When the buyer names it through the first order
      const [orderId, ticketId] = target(
        own.orderId,
        other.orderId,
        otherTicket.id,
      );
      const result = await ctx.orders.nameTicket(orderId, ticketId, {
        holderName: 'Ana',
      });

      // Then 404 and nothing changes
      expect(result.status).toBe(404);
      const [unchanged] = await ticketsOf(other.orderId);
      expect(unchanged).toMatchObject({
        status: TicketStatus.ISSUED,
        holderName: null,
      });
    });
  });

  describe('invalid holder data', () => {
    // Table: no holder name | blank holder name | invalid email
    it.each<[string, { holderName?: string; holderEmail?: string }]>([
      ['no holder name', {}],
      ['a blank holder name', { holderName: '   ' }],
      ['an invalid email', { holderName: 'Ana', holderEmail: 'not-an-email' }],
    ])('%s is rejected', async (_case, holder) => {
      // Given an ISSUED ticket
      const { orderId, ticketId } = await anIssuedTicket();

      // When the buyer names it with that data
      const result = await ctx.orders.nameTicket(orderId, ticketId, holder);

      // Then 400 and the ticket stays ISSUED
      expect(result.status).toBe(400);
      const [ticket] = await ticketsOf(orderId);
      expect(ticket.status).toBe(TicketStatus.ISSUED);
    });
  });

  describe('only paid orders have tickets', () => {
    // Table: pending | cancelled
    it.each<[string, (orderId: string) => Promise<unknown>]>([
      ['pending', () => Promise.resolve()],
      ['cancelled', (orderId) => reportPayment(orderId, 'cancelled')],
    ])('a %s order has none', async (_status, bringTo) => {
      // Given an order with that status
      const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
      const order = await placeOrder(eventId, tierId, 2);
      await bringTo(order.body.id);

      // When the buyer lists its tickets
      const result = await ctx.orders.tickets(order.body.id);

      // Then the list is empty
      expect(result.status).toBe(200);
      expect(result.body).toEqual([]);
    });
  });

  it('the views never expose the buyer document or any email', async () => {
    // Given a paid order with a named ticket
    const { orderId, buyer } = await aPaidOrder(1);
    const [ticket] = await ticketsOf(orderId);
    await ctx.orders.nameTicket(orderId, ticket.id, {
      holderName: 'Ana',
      holderEmail: 'holder@test.com',
    });

    // When the buyer views the order and lists its tickets
    const order = await ctx.orders.get(orderId);
    const tickets = await ctx.orders.tickets(orderId);

    // Then neither response contains the buyer's document, the buyer's email or the holder's email
    expect(order.status).toBe(200);
    expect(tickets.body).toHaveLength(1);
    const responses = JSON.stringify([order.body, tickets.body]);
    expect(responses).not.toContain(buyer.documentNumber);
    expect(responses).not.toContain(buyer.email);
    expect(responses).not.toContain('holder@test.com');
  });

  describe('an unknown order', () => {
    // Table: view the order | list its tickets
    it.each<[string, (orderId: string) => Promise<{ status: number }>]>([
      ['viewing it', (orderId) => ctx.orders.get(orderId)],
      ['listing its tickets', (orderId) => ctx.orders.tickets(orderId)],
    ])('is 404 when %s', async (_case, ask) => {
      // When the buyer asks for it
      const result = await ask(randomUUID());

      // Then 404
      expect(result.status).toBe(404);
    });
  });
});
