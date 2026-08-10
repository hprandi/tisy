import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateTicketTierDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsInt()
  @IsPositive()
  quantityTotal!: number;

  @IsDateString()
  salesStartAt!: string;

  @IsDateString()
  salesEndAt!: string;
}
