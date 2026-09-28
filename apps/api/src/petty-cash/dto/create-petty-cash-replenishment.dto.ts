import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePettyCashReplenishmentDto {
  @IsUUID()
  accountId: string;

  @IsDateString()
  replenishmentDate: string;

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
