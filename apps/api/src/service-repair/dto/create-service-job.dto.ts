import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateServiceJobDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
