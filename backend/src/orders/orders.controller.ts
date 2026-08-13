import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateOrderDto } from './create-order.dto';
import { OrdersService } from './orders.service';

@Controller('events/:eventId/orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.ordersService.create(eventId, createOrderDto, user?.userId);
  }
}
