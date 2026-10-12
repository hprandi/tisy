import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentStatusService } from './payment-status.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type WebhookNotification,
} from './payment-provider.interface';

@ApiTags('payments')
@Controller('payments/webhook')
export class PaymentsController {
  constructor(
    @Inject(PAYMENT_PROVIDER) private paymentProvider: PaymentProvider,
    private paymentConfirmationService: PaymentStatusService,
  ) {}

  // @Req() instead of @Body(): this payload is Mercado Pago's own shape, not
  // ours, so it shouldn't go through our ValidationPipe's whitelist.
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(@Req() request: Request) {
    const notification: WebhookNotification = {
      signature: request.headers['x-signature'],
      requestId: request.headers['x-request-id'],
      resourceId: request.query['data.id'] as string | string[] | undefined,
      body: request.body,
    };

    if (!this.paymentProvider.verifyWebhookSignature(notification)) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    const paymentId = this.paymentProvider.extractPaymentId(notification);
    if (!paymentId) {
      return { received: true };
    }

    const { status, orderId } =
      await this.paymentProvider.getPaymentStatus(paymentId); // Re-fetches from the provider's API instead of trusting the webhook payload
    await this.paymentConfirmationService.receivePaymentStatusUpdate(
      orderId,
      status,
      paymentId,
    );
    return { received: true };
  }
}
