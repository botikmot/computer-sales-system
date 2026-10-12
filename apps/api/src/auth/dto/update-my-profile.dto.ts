import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  // null or a blank value can be used to clear the optional email field.
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;
}
