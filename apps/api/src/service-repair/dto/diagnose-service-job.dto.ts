import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DiagnoseServiceJobDto {
  @IsString()
  @MaxLength(5000)
  diagnosticFindings!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  laborCharge!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
