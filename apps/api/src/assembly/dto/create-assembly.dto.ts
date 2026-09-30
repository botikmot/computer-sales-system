import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateAssemblyDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  billOfMaterialId!: string;

  @IsInt()
  @Min(1)
  quantityProduced!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
