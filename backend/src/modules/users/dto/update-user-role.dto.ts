import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({ example: UserRole.User, enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
