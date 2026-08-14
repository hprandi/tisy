import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from 'mercadopago';
import {
  PaymentConfirmationStatus,
  PaymentSession,
  PaymentProvider,
  PaymentStatusResult,
  StartPaymentData,
  WebhookNotification,
} from './payment-provider.interface';

// Rejects notifications whose timestamp has drifted too far — mitigates replay attacks.
const WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300;

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  readonly providerName = 'mercadopago';

  private readonly logger = new Logger(MercadoPagoProvider.name);
  private client: MercadoPagoConfig;
  private webhookSecret: string;

  constructor(configService: ConfigService) {
    this.client = new MercadoPagoConfig({
      accessToken: configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')!,
    });
    this.webhookSecret = configService.get<string>(
      'MERCADOPAGO_WEBHOOK_SECRET',
    )!;
  }

  async startPayment(data: StartPaymentData): Promise<PaymentSession> {
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

  verifyWebhookSignature(notification: WebhookNotification): boolean {
    try {
      WebhookSignatureValidator.validate({
        xSignature: notification.signature,
        xRequestId: notification.requestId,
        dataId: notification.resourceId,
        secret: this.webhookSecret,
        toleranceSeconds: WEBHOOK_SIGNATURE_TOLERANCE_SECONDS,
      });
      return true;
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        this.logger.warn(`Rejected Mercado Pago webhook: ${error.reason} (request ${error.requestId})`);
        return false;
      }
      throw error;
    }
  }

  extractPaymentId(notification: WebhookNotification): string | null {
    const body = notification.body as { type?: string; data?: { id?: string } };

    // Checkout Pro also sends `merchant_order` notifications to this URL.
    if (body?.type !== 'payment' || !body.data?.id) {
      return null;
    }

    return body.data.id;
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    const payment = new Payment(this.client);
    const result = await payment.get({ id: paymentId });

    if (!result.external_reference) {
      throw new BadGatewayException(`Mercado Pago payment ${paymentId} is missing external_reference.`,);
    }

    return {
      status: this.toConfirmationStatus(result.status),
      orderId: result.external_reference,
    };
  }

  private toConfirmationStatus(mpStatus?: string): PaymentConfirmationStatus {
    switch (mpStatus) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'cancelled':
      case 'refunded':
      case 'charged_back':
        return 'cancelled';
      default:
        // pending, in_process, authorized, or anything unrecognized.
        return 'pending';
    }
  }
}
