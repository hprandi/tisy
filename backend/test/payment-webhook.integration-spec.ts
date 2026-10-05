describe('Payment webhook (integration)', () => {
  // These cases run the real MercadoPagoProvider with the Mercado Pago HTTP API faked.
  // The checkout tests replace the provider entirely, so signature and payload
  // handling never run there.

  // Given a pending order
  // When a correctly signed approved payment notification arrives
  // Then the order becomes PAID
  it.todo(
    'happy path: a correctly signed approved notification marks the order PAID',
  );

  // Given a pending order
  // When the webhook arrives with a wrong signature
  // Then the response is 401 and the order and stock are untouched
  it.todo('a webhook with an invalid signature is rejected');

  // Given a pending order
  // When a correctly signed merchant_order notification arrives
  // Then the response is 200 and nothing changes
  it.todo('notifications that are not about a payment are ignored');

  // Known bug: today this answers 500. The expected status is to be decided
  //   (502 proposed, as in startPayment)
  // Given a pending order
  // When a correctly signed notification points to a payment Mercado Pago does not know
  // Then the response is a handled error (not 500) and the order is untouched
  it.todo('a payment unknown to Mercado Pago is handled, not a 500');
});
