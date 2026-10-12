import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventsService } from '../events/events.service';
import { CheckInDto } from './check-in.dto';
import { TicketsService } from './tickets.service';

@ApiTags('check-in')
@Controller('events/:eventId/check-in')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CheckInController {
  constructor(
    private ticketsService: TicketsService,
    private eventsService: EventsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @Param('eventId') eventId: string,
    @Body() checkInDto: CheckInDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.eventsService.findOwnedById(eventId, user.userId);
    return this.ticketsService.checkIn(eventId, checkInDto.code);
  }
}
