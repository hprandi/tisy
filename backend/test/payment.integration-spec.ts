import { OrderStatus, TicketStatus } from '@prisma/client';
import { checkoutHelpers } from './helpers/checkout-helpers';
import { seedEventOnSale } from './helpers/fixtures';
import { paymentHelpers } from './helpers/payment-helpers';
import { useTestApp } from './helpers/test-app';

describe('Payment (integration)', () => {
  const ctx = useTestApp();
  const { placeOrder, findOrder, stockOf, ticketsOf } = checkoutHelpers(ctx);
  const { reportPayment } = paymentHelpers(ctx);

  it('an approved payment marks the order PAID and issues its tickets', async () => {
    // Given a pending order of 2 tickets whose payment was started
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);
    await ctx.orders.startPayment(order.body.id);

    // When the payment provider reports the payment approved
    await reportPayment(order.body.id, 'approved');

    // Then the order is PAID, paidAt is set, paymentExternalId is the payment id
    //   (not the checkout session id) and the stock is still 8
    const paid = await findOrder(order.body.id);
    expect(paid.status).toBe(OrderStatus.PAID);
    expect(paid.paidAt).not.toBeNull();
    expect(paid.paymentExternalId).toBe('fake-payment-id');
    expect(await stockOf(tierId)).toBe(8);

    // And it has 2 tickets, ISSUED and without a holder, with different codes of
    //   22 base64url characters
    const tickets = await ticketsOf(order.body.id);
    expect(tickets).toHaveLength(2);
    for (const ticket of tickets) {
      expect(ticket).toMatchObject({
        status: TicketStatus.ISSUED,
        holderName: null,
      });
      expect(ticket.code).toMatch(/^[A-Za-z0-9_-]{22}$/);
    }
    expect(new Set(tickets.map((ticket) => ticket.code)).size).toBe(2);
  });

  it('a cancelled payment cancels the order, releases the stock and issues no tickets', async () => {
    // Given a pending order of 2 tickets (stock 8)
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);
    expect(await stockOf(tierId)).toBe(8);

    // When the payment provider reports the payment cancelled
    await reportPayment(order.body.id, 'cancelled');

    // Then the order is CANCELLED, the stock is back to 10 and it has no tickets
    expect((await findOrder(order.body.id)).status).toBe(OrderStatus.CANCELLED);
    expect(await stockOf(tierId)).toBe(10);
    expect(await ticketsOf(order.body.id)).toHaveLength(0);
  });

  it('a pending payment waits and a later approval marks the order PAID', async () => {
    // Given a pending order of 2 tickets
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);

    // When the payment provider first reports the payment pending, then approved
    await reportPayment(order.body.id, 'pending');
    const afterPending = await findOrder(order.body.id);
    const ticketsAfterPending = await ticketsOf(order.body.id);
    await reportPayment(order.body.id, 'approved');
    const afterApproved = await findOrder(order.body.id);

    // Then the order stays PENDING without tickets after the first notification
    //   and becomes PAID with its 2 tickets after the second
    expect(afterPending.status).toBe(OrderStatus.PENDING);
    expect(ticketsAfterPending).toHaveLength(0);
    expect(afterApproved.status).toBe(OrderStatus.PAID);
    expect(await ticketsOf(order.body.id)).toHaveLength(2);
  });

  it('a cancelled notification repeated twice releases the stock once', async () => {
    // Given a pending order of 2 tickets (stock 8)
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);

    // When the same cancelled notification arrives twice
    await reportPayment(order.body.id, 'cancelled');
    await reportPayment(order.body.id, 'cancelled');

    // Then the stock is 10, not 12
    expect(await stockOf(tierId)).toBe(10);
  });

  it('an approved notification repeated twice changes nothing the second time', async () => {
    // Given a pending order of 2 tickets
    const { eventId, tierId } = await seedEventOnSale(ctx.prisma);
    const order = await placeOrder(eventId, tierId, 2);

    // When the same approved notification arrives twice
    await reportPayment(order.body.id, 'approved');
    const firstPaidAt = (await findOrder(order.body.id)).paidAt;
    await reportPayment(order.body.id, 'approved');

    // Then the order is PAID, paidAt does not change and it still has 2 tickets
    const afterSecond = await findOrder(order.body.id);
    expect(afterSecond.status).toBe(OrderStatus.PAID);
    expect(afterSecond.paidAt).toEqual(firstPaidAt);
    expect(await ticketsOf(order.body.id)).toHaveLength(2);
  });
});
