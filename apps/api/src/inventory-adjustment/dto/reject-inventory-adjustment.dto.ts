import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectInventoryAdjustmentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  rejectionReason!: string;
}
