import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventsService } from '../events/events.service';
import { CreateTicketTierDto } from './create-ticket-tier.dto';
import { TicketTiersService } from './ticket-tiers.service';
import { UpdateTicketTierDto } from './update-ticket-tier.dto';

@Controller('events/:eventId/ticket-tiers')
@UseGuards(JwtAuthGuard)
export class TicketTiersController {
  constructor(
    private ticketTiersService: TicketTiersService,
    private eventsService: EventsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() createTicketTierDto: CreateTicketTierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.eventsService.findOwnedById(eventId, user.userId);
    return this.ticketTiersService.create(eventId, createTicketTierDto);
  }

  @Get()
  async findAll(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.eventsService.findOwnedById(eventId, user.userId);
    return this.ticketTiersService.findAllByEvent(eventId);
  }

  @Patch(':id')
  async update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() updateTicketTierDto: UpdateTicketTierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.eventsService.findOwnedById(eventId, user.userId);
    const tier = await this.ticketTiersService.findByIdInEvent(id, eventId);
    return this.ticketTiersService.update(tier, updateTicketTierDto);
  }
}
