import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { BankReconciliationItemType } from '@computer-sales/database';

export class AddBankReconciliationItemDto {
  @IsEnum(BankReconciliationItemType)
  type: BankReconciliationItemType;

  @IsString()
  amount: string;

  @IsOptional()
  @IsUUID()
  cashBankTransactionId?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
