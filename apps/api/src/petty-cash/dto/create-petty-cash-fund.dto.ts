import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePettyCashFundDto {
  @IsUUID()
  branchId: string;

  @IsString()
  name: string;

  @IsString()
  openingBalance: string;

  @IsOptional()
  @IsUUID()
  custodianId?: string;
}
