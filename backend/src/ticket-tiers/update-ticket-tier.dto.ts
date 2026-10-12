import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTicketTierDto } from './create-ticket-tier.dto';

export class UpdateTicketTierDto extends PartialType(
  OmitType(CreateTicketTierDto, ['quantityTotal'] as const),
) {}
