import { aGuestBuyer } from './builders';
import type { AppContext } from './test-app';

// Order helpers shared by the specs that need "a pending order". Bound to the
// test context once, so call sites stay short: placeOrder(eventId, tierId, 2).
export function checkoutHelpers(ctx: AppContext) {
  return {
    placeOrder: (eventId: string, tierId: string, quantity: number) =>
      ctx.orders.createAsGuest({
        eventId,
        buyer: aGuestBuyer(),
        items: [{ ticketTierId: tierId, quantity }],
      }),

    findOrder: (orderId: string) =>
      ctx.prisma.order.findUniqueOrThrow({ where: { id: orderId } }),

    ticketsOf: (orderId: string) =>
      ctx.prisma.ticket.findMany({ where: { orderItem: { orderId } } }),

    stockOf: async (tierId: string): Promise<number> => {
      const tier = await ctx.prisma.ticketTier.findUniqueOrThrow({
        where: { id: tierId },
      });
      return tier.quantityAvailable;
    },
  };
}
