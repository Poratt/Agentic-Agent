import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@admin.com',
    format: 'email',
    description:
      'Registered email address of the user. ' +
      'Must be a valid email format (user@domain.com). ' +
      'Case-insensitive - "Admin@Admin.com" and "admin@admin.com" are treated as the same.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'admin1234',
    minLength: 4,
    description:
      'Account password. Minimum 4 characters for login validation. ' +
      'Sent over HTTPS; hashing and comparison are handled server-side. ' +
      'Returns 401 if this does not match the stored hash.',
  })
  @IsString()
  @MinLength(4)
  password!: string;
}
