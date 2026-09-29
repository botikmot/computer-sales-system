import { IsOptional, IsUUID } from 'class-validator';

export class UpdateUserBranchDto {
  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}
