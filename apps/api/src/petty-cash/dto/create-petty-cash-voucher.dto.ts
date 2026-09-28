import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePettyCashVoucherDto {
  @IsDateString()
  expenseDate: string;

  @IsString()
  description: string;

  @IsString()
  amount: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  payee?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;
}
