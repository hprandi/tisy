import { Module } from '@nestjs/common';
import { MercadoPagoProvider } from './mercadopago.provider';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

@Module({
  providers: [{ provide: PAYMENT_PROVIDER, useClass: MercadoPagoProvider }],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
