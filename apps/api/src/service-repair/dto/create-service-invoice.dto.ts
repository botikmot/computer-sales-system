import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateServiceInvoiceDto {
  @IsIn(['CASH', 'CREDIT'])
  paymentMode!: 'CASH' | 'CREDIT';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
