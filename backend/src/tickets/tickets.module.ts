import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketsService } from './tickets.service';

@Module({
  imports: [PrismaModule],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
