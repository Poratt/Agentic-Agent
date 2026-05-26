import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Updated',
    description:
      'Full display name of the user. ' +
      'Optional — omit this field to leave the current value unchanged. ' +
      'Must be a non-empty string if provided (whitespace-only is rejected). ' +
      'No maximum length enforced at DTO level.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'updated@example.com',
    format: 'email',
    description:
      'New email address for the user. ' +
      'Optional — omit to keep the current email. ' +
      'Must be a valid email format if provided. ' +
      'Returns 400 if the email is already taken by another account.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.User,
    description:
      'New role for the user. ' +
      'Optional — omit to keep the current role. ' +
      'Accepted values: "user" | "admin". ' +
      'Prefer using PATCH /users/:id/role for role-only changes ' +
      '(that endpoint is more explicit and easier to audit).',
  })
  @IsOptional()
  role?: UserRole;
}