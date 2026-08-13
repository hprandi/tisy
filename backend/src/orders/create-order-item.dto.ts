import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  ticketTierId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
