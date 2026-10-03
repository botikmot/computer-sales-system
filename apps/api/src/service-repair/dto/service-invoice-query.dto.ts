import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ServiceInvoiceStatus } from '@computer-sales/database';

export class ServiceInvoiceQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ServiceInvoiceStatus)
  status?: ServiceInvoiceStatus;

  @IsOptional()
  @IsIn(['invoiceNo', 'invoiceDate', 'total', 'status', 'createdAt'])
  sortBy = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder = 'desc';
}
