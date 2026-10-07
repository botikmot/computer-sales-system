import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { PurchaseInvoiceStatus } from '@computer-sales/database';

export class PurchaseInvoiceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(PurchaseInvoiceStatus)
  status?: PurchaseInvoiceStatus;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  sortBy?:
    | 'invoiceNo'
    | 'invoiceDate'
    | 'dueDate'
    | 'total'
    | 'balanceDue'
    | 'status'
    | 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
