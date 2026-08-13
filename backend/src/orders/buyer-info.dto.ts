import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DocumentType } from '../users/create-user.dto';

export class BuyerInfoDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsNotEmpty()
  @IsString()
  documentNumber!: string;
}
