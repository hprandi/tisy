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

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
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
}
