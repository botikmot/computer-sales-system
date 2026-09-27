import { IsDateString, IsEnum, IsOptional } from 'class-validator';

import { SalesOrderDeliveryMode } from '@computer-sales/database';

export class ReleaseSalesOrderDto {
  @IsEnum(SalesOrderDeliveryMode)
  deliveryMode!: SalesOrderDeliveryMode;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
