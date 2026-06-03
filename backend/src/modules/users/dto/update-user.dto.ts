import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for partially updating user profile fields.
 *
 * Intended usage:
 * - Used by PATCH `/users/:id`.
 * - All fields are optional; omit a field to keep its current persisted value.
 * - Role changes are intentionally excluded; use PATCH `/users/:id/role`.
 *
 * Validation behavior:
 * - If a field is provided but fails DTO validation, the request is rejected with `400 Bad Request`.
 * - Business-rule validation, such as unique email, is enforced by the service/database layer.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Updated',
    description:
      'Full display name of the user. ' +
      'Optional - omit this field to leave the current value unchanged. ' +
      'Validation: if provided, must be a string and must not be empty.',
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
      'Optional - omit to keep the current email. ' +
      'Validation: must be a valid email format if provided. ' +
      'Uniqueness is enforced by the service/database layer.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
