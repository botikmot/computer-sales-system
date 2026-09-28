import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseOrderStatus } from '@computer-sales/database';

export class PurchasingReportQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
