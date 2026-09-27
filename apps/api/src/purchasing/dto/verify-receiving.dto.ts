import {
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyReceivingItemDto {
  @IsUUID()
  receivingItemId!: string;

  @IsInt()
  @Min(0)
  quantityAccepted!: number;

  @IsInt()
  @Min(0)
  quantityRejected!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  qualityNotes?: string;
}

export class VerifyReceivingDto {
  @ValidateNested({ each: true })
  @Type(() => VerifyReceivingItemDto)
  @ArrayMinSize(1)
  items!: VerifyReceivingItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  checkNotes?: string;
}
