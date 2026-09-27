import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { CashBankAccountType } from '@computer-sales/database';

export class CreateCashBankAccountDto {
  @IsUUID()
  branchId!: string;

  @IsEnum(CashBankAccountType)
  accountType!: CashBankAccountType;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;
}
