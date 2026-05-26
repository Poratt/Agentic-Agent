import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({
    example: UserRole.User,
    enum: UserRole,
    enumName: 'UserRole',
    description:
      'The new role to assign to the user. ' +
      'Accepted values: "user" (standard access) | "admin" (full system access). ' +
      'Returns 400 if the value is not a valid UserRole enum member. ' +
      'Use "admin" with caution — grants access to all admin-only endpoints.',
  })
  @IsEnum(UserRole)
  role!: UserRole;
}