import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Updated' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiPropertyOptional({ description: 'User email address', example: 'updated@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User role within the system', enum: UserRole, example: UserRole.User })
  @IsOptional()
  role?: UserRole;
}
