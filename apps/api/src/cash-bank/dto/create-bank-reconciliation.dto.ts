import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBankReconciliationDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  accountId: string;

  @IsISO8601()
  statementDate: string;

  @IsString()
  statementEndingBalance: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
