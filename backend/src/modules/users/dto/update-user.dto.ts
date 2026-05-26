import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

/**
 * DTO for partially updating a user record.
 *
 * Intended usage:
 * - Used by PATCH endpoints that support partial updates (e.g., PATCH `/users/:id`).
 * - All fields are optional; omit a field to keep its current persisted value.
 *
 * Validation behavior:
 * - If a field is provided but fails DTO validation, the request is rejected with `400 Bad Request`.
 * - Business-rule validation (e.g., unique email) is typically enforced by the service/database layer and also returns `400 Bad Request` when violated.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Updated',
    description:
      'Full display name of the user. ' +
      'Optional — omit this field to leave the current value unchanged. ' +
      'Validation: if provided, must be a string and must not be empty (whitespace-only is rejected). ' +
      'Returns 400 if the value is empty while provided.',
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
      'Validation: must be a valid email format if provided; returns 400 if invalid. ' +
      'Uniqueness: returns 400 if the email is already taken by another account.',
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
      'Validation: must be a valid UserRole value; returns 400 if invalid. ' +
      'Accepted values: "user" | "admin". ' +
      'Prefer using PATCH /users/:id/role for role-only changes (more explicit and easier to audit).',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
