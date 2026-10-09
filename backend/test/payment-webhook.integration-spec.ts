describe('Payment webhook (integration)', () => {
  // Runs the real MercadoPagoProvider with only the Mercado Pago HTTP API faked
  // (the checkout tests replace the provider, so signature and payload handling never run there).

  // Given a pending order
  // When a correctly signed notification reports its payment approved
  // Then the order is PAID
  it.todo('happy path: a signed approved notification marks the order PAID');

  // Given a pending order
  // When a notification arrives with a wrong signature
  // Then 401 and the order stays PENDING
  it.todo('a notification with an invalid signature is rejected');

  // Given a pending order
  // When a signed notification of type merchant_order arrives
  // Then 200 and the order is untouched
  it.todo('notifications that are not about a payment are ignored');

  // Known bug: answers 500 today; expected status to be decided (502 proposed, as in startPayment)
  // Given a pending order
  // When a signed notification points to a payment Mercado Pago does not know
  // Then a handled error (not 500) and the order is untouched
  it.todo('a payment unknown to Mercado Pago is not a 500');
});
