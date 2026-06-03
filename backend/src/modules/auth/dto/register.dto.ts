import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

const passwordMinLength = 8;

/**
 * DTO for registering a new user account.
 *
 * Validation behavior:
 * - DTO validation failures return `400 Bad Request`.
 * - Business-rule failures, such as duplicate email, are enforced by the service/database layer.
 */
export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description:
      'Full display name for the new account. ' +
      'Required - must be a non-empty string. ' +
      'This field is not required to be unique.',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    example: 'admin@admin.com',
    format: 'email',
    description:
      'Email address for the new account. ' +
      'Required - must be a valid email format and must be unique.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'admin1234',
    minLength: passwordMinLength,
    description:
      `Password for the new account. Minimum ${passwordMinLength} characters. ` +
      'Required - stored as a bcrypt hash and never persisted as plain text.',
  })
  @IsString()
  @MinLength(passwordMinLength, { message: 'Password must be at least 8 characters long' })
  password!: string;
}
