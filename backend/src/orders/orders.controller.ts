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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateOrderDto } from './create-order.dto';
import { OrdersService } from './orders.service';
import { NameTicketDto } from '../tickets/name-ticket.dto';
import { TicketsService } from '../tickets/tickets.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private ticketsService: TicketsService,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.ordersService.create(
      createOrderDto.eventId,
      createOrderDto,
      user?.userId,
    );
  }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  async startPayment(@Param('id') id: string) {
    return this.ordersService.startPayment(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findPublicView(id);
  }

  @Get(':id/tickets')
  async listTickets(@Param('id') id: string) {
    await this.ordersService.assertExists(id);
    return this.ticketsService.listForOrder(id);
  }

  @Patch(':id/tickets/:ticketId')
  async nameTicket(
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
    @Body() nameTicketDto: NameTicketDto,
  ) {
    return this.ticketsService.name(id, ticketId, nameTicketDto);
  }
}
