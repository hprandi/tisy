import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CheckInController } from './check-in.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [CheckInController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
