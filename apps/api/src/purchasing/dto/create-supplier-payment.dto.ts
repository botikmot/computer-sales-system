import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsUUID()
  accountsPayableId!: string;

  @IsUUID()
  accountId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referenceNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
