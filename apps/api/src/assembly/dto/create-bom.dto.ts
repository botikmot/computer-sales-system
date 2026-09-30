import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BomItemDto {
  @IsUUID()
  componentProductId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateBomDto {
  @IsUUID()
  finishedProductId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items!: BomItemDto[];
}
