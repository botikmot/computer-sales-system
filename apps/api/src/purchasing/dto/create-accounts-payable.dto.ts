import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAccountsPayableDto {
  @IsUUID()
  purchaseInvoiceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
