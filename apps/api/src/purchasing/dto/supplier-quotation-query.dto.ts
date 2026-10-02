import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SupplierQuotationQueryDto {
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
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  purchaseRequestId?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'RECEIVED', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
  status?: 'DRAFT' | 'RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsIn([
    'quotationNo',
    'quotationDate',
    'validUntil',
    'status',
    'total',
    'createdAt',
  ])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
