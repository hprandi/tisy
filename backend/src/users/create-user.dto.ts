import { IsEmail, IsNotEmpty, IsEnum, MinLength } from 'class-validator';

export enum DocumentType {
  CPF = 'CPF',
  PASSPORT = 'PASSPORT',
  OTHER = 'OTHER',
}

export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8, {
    message: 'password must be at least 8 characters long',
  })
  password!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsNotEmpty()
  documentNumber!: string;
}
