import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  IsInt,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class SalesQuotationItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;
}

export class CreateSalesQuotationDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  inquiryId!: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount: number = 0;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => SalesQuotationItemDto)
  items!: SalesQuotationItemDto[];
}
