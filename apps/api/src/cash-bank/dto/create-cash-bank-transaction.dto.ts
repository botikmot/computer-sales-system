import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum CashBankManualTransactionType {
  OTHER_RECEIPT = 'OTHER_RECEIPT',
  EXPENSE = 'EXPENSE',
}

export class CreateCashBankTransactionDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  accountId: string;

  @IsEnum(CashBankManualTransactionType)
  transactionType: CashBankManualTransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
