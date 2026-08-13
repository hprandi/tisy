import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BuyerInfoDto } from './buyer-info.dto';
import { CreateOrderItemDto } from './create-order-item.dto';

export enum BuyerType {
  ME = 'me',
  NEW = 'new',
}

export class CreateOrderDto {
  @IsEnum(BuyerType)
  buyerType!: BuyerType;

  @ValidateIf((dto: CreateOrderDto) => dto.buyerType === BuyerType.NEW)
  @IsDefined()
  @ValidateNested()
  @Type(() => BuyerInfoDto)
  buyerInfo?: BuyerInfoDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
