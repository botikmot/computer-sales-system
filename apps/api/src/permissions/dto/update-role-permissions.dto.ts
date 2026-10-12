import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';

import {
  PERMISSION_REGISTRY,
  type PermissionKey,
} from '../permission.registry.js';

export class RolePermissionChangeDto {
  @IsString()
  @IsIn(PERMISSION_REGISTRY.map((permission) => permission.key))
  permissionKey!: PermissionKey;

  @IsBoolean()
  isAllowed!: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique((item: RolePermissionChangeDto) => item.permissionKey)
  @ValidateNested({ each: true })
  @Type(() => RolePermissionChangeDto)
  permissions!: RolePermissionChangeDto[];
}
