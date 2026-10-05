describe('Checkout (integration)', () => {
  // Given an event on sale with a tier of 10 tickets
  // When a guest buyer orders 2, starts the payment and Mercado Pago reports it approved
  // Then the order ends PAID
  it.todo('happy path: a guest buyer orders, pays and the order becomes PAID');

  // Given an event on sale with a tier of 10 tickets
  // When a guest buyer orders 2
  // Then the order is PENDING with total = 2 x price and an expiry set, and the tier stock is 8
  it.todo('placing an order reserves the stock');

  // Given a pending order of 2 tickets whose payment was started
  // When Mercado Pago reports the payment approved
  // Then the order is PAID, paidAt is set, paymentExternalId is the payment id
  //   (not the preference id) and the stock is still 8
  it.todo('an approved payment marks the order PAID');

  // Given a pending order of 2 tickets (stock 8)
  // When Mercado Pago reports the payment cancelled
  // Then the order is CANCELLED and the stock is back to 10
  it.todo('a cancelled payment cancels the order and releases the stock');

  // Given a pending order
  // When Mercado Pago first reports the payment pending, then approved
  // Then the order stays PENDING after the first notification and becomes PAID after the second
  it.todo('a pending payment waits and a later approval marks the order PAID');

  // Given a pending order of 2 tickets (stock 8)
  // When the same cancelled notification arrives twice
  // Then the stock is 10, not 12
  it.todo('a cancelled notification repeated twice releases the stock once');

  // Given a pending order
  // When the same approved notification arrives twice
  // Then the order is PAID and paidAt does not change on the second one
  it.todo('an approved notification repeated twice does not change paidAt');

  // Given a tier with 1 ticket left
  // When two buyers order it at the same time
  // Then exactly one gets 201 and the other 409, the stock is 0 and only one order exists
  it.todo('two buyers racing for the last ticket cannot oversell it');

  // Given an order whose payment was already started
  // When the buyer starts the payment again
  // Then the same checkoutUrl is returned and the provider is called only once
  it.todo('starting the payment twice returns the same checkout');

  // Table: draft event (400) | tier outside its sales window (400) | quantity above the stock (409)
  // Given an event and tiers matching each case
  // When the buyer places each order
  // Then each is rejected with the status above and no stock changes
  it.todo('orders that are not allowed leave the stock untouched');
});
