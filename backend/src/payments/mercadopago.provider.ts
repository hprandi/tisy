import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import {
  PaymentSession,
  PaymentProvider,
  StartPaymentData,
} from './payment-provider.interface';

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  private client: MercadoPagoConfig;

  constructor(configService: ConfigService) {
    this.client = new MercadoPagoConfig({
      accessToken: configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')!,
    });
  }

  async startPayment(
    data: StartPaymentData,
  ): Promise<PaymentSession> {
    const preference = new Preference(this.client);

    try {
      const result = await preference.create({
        body: {
          items: data.items.map((item) => ({
            id: item.ticketTierId,
            title: item.ticketTierName,
            quantity: item.quantity,
            unit_price: Number(item.unitPrice),
            currency_id: item.currency,
          })),
          back_urls: {
            success: 'http://localhost:3000/checkout/success',
            failure: 'http://localhost:3000/checkout/failure',
            pending: 'http://localhost:3000/checkout/pending',
          },
          external_reference: data.orderId,
        },
      });

      return {
        externalId: result.id!,
        checkoutUrl: result.sandbox_init_point ?? result.init_point!,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Mercado Pago checkout session for order ${data.orderId}`,
        error instanceof Error ? error.stack : error,
      );
      throw new BadGatewayException(
        'Unable to start payment. Please try again.',
      );
    }
  }
}
