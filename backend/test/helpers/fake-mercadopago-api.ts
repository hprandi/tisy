import nock from 'nock';

const MERCADOPAGO_API = 'https://api.mercadopago.com';

// Fakes only the Mercado Pago HTTP API, so the real MercadoPagoProvider runs.
// Any other outgoing request fails the test instead of reaching the internet.
export class FakeMercadoPagoApi {
  install(): void {
    nock.disableNetConnect();
    nock.enableNetConnect(/127\.0\.0\.1|localhost/);
  }

  reset(): void {
    nock.cleanAll();
  }

  uninstall(): void {
    nock.cleanAll();
    nock.enableNetConnect();
  }

  reportsPayment(payment: {
    id: string;
    status: string;
    orderId: string;
  }): void {
    nock(MERCADOPAGO_API)
      .get(`/v1/payments/${payment.id}`)
      .reply(200, {
        id: Number(payment.id),
        status: payment.status,
        external_reference: payment.orderId,
      });
  }

  doesNotKnowPayment(id: string): void {
    nock(MERCADOPAGO_API)
      .get(`/v1/payments/${id}`)
      .reply(404, {
        message: 'Payment not found',
        error: 'not_found',
        status: 404,
        cause: [{ code: 2000, description: 'Payment not found' }],
      });
  }
}
