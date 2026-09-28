import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddServiceJobPartDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  requiredQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
