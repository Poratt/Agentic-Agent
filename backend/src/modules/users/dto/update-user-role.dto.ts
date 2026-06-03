import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

/**
 * DTO for updating a user's authorization role.
 *
 * Intended usage:
 * - Used only by role-focused endpoints such as PATCH `/users/:id/role`.
 *
 * Validation behavior:
 * - Returns `400 Bad Request` if `role` is not a valid numeric {@link UserRole} enum member.
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    example: UserRole.User,
    enum: UserRole,
    enumName: 'UserRole',
    description:
      'The new numeric role to assign to the user. ' +
      'Required - this DTO represents a role-only update. ' +
      'Accepted numeric values: 1 = Admin, 2 = User. ' +
      'Security note: use 1 with caution because it grants access to admin-only endpoints.',
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
