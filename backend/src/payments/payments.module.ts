import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketTiersModule } from '../ticket-tiers/ticket-tiers.module';
import { MercadoPagoProvider } from './mercadopago.provider';
import { PaymentStatusService } from './payment-status.service';
import { PaymentsController } from './payments.controller';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

@Module({
  imports: [PrismaModule, TicketTiersModule],
  controllers: [PaymentsController],
  providers: [
    { provide: PAYMENT_PROVIDER, useClass: MercadoPagoProvider },
    PaymentStatusService,
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
