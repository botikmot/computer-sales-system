import { IsEnum } from 'class-validator';

import { UserRole } from '@computer-sales/database';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
