import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

const passwordMinLength = 8;

/**
 * DTO for registering (creating) a new user account.
 *
 * Validation behavior:
 * - DTO validation failures return `400 Bad Request` (e.g., invalid email format, password too short).
 * - Business-rule failures (e.g., email already registered) are typically enforced by the service/database layer and also return `400 Bad Request` when violated.
 */
export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description:
      'Full display name for the new account. ' +
      'Required - must be a non-empty string. ' +
      'Validation: returns 400 if missing, empty, or whitespace-only. ' +
      'Uniqueness: not required to be unique.',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    example: 'admin@admin.com',
    format: 'email',
    description:
      'Email address for the new account. ' +
      'Required - must be a valid email format and must be unique. ' +
      'Validation: returns 400 if the email format is invalid. ' +
      'Uniqueness: returns 400 if already registered.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'admin',
    minLength: passwordMinLength,
    description:
      `Password for the new account. Minimum ${passwordMinLength} characters. ` +
      'Required - stored as a bcrypt hash (never stored as plain text). ' +
      `Validation: returns 400 if shorter than ${passwordMinLength} characters.`,
  })
  @IsString()
  @MinLength(passwordMinLength, { message: 'הסיסמה חייבת להיות לפחות 8 תווים' })
  password!: string;
}
