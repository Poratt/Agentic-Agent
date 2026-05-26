import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../../core/enums/user-role.enum';

/**
 * DTO for updating a user's role (authorization level).
 *
 * Intended usage:
 * - Used by role-focused endpoints (e.g., PATCH `/users/:id/role`) so audit logs and permissions are explicit.
 *
 * Validation behavior:
 * - Returns `400 Bad Request` if `role` is not a valid {@link UserRole} enum member.
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    example: UserRole.User,
    enum: UserRole,
    enumName: 'UserRole',
    description:
      'The new role to assign to the user. ' +
      'Required — this DTO represents a role-only update. ' +
      'Accepted values: "user" (standard access) | "admin" (full system access). ' +
      'Validation: returns 400 if the value is not a valid UserRole enum member. ' +
      'Security note: use "admin" with caution — it grants access to admin-only endpoints.',
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
