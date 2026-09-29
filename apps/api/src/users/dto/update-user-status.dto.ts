import { IsEnum } from 'class-validator';

import { UserStatus } from '@computer-sales/database';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
