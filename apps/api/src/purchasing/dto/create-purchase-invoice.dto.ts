import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentModeDto {
  COD = 'COD',
  TERMS = 'TERMS',
  CASH = 'CASH',
}

export class PurchaseInvoiceItemDto {
  @IsUUID()
  receivingItemId!: string;
}

export class CreatePurchaseInvoiceDto {
  @IsUUID()
  receivingId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierInvoiceNo?: string;

  @IsEnum(PaymentModeDto)
  paymentMode!: PaymentModeDto;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceItemDto)
  @ArrayMinSize(1)
  items!: PurchaseInvoiceItemDto[];
}
