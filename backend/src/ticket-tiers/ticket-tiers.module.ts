import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketTiersController } from './ticket-tiers.controller';
import { TicketTiersService } from './ticket-tiers.service';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [TicketTiersController],
  providers: [TicketTiersService],
})
export class TicketTiersModule {}
