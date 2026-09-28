import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { SalesReturnSettlementMode } from '@computer-sales/database';

class SalesReturnItemDto {
  @IsUUID()
  salesInvoiceItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateSalesReturnDto {
  @IsUUID()
  salesInvoiceId!: string;

  @IsEnum(SalesReturnSettlementMode)
  settlementMode!: SalesReturnSettlementMode;

  @IsOptional()
  @IsUUID()
  refundAccountId?: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => SalesReturnItemDto)
  items!: SalesReturnItemDto[];
}
