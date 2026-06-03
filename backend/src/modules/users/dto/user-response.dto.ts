import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../core/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({ description: 'Unique numeric user id.', example: 1 })
  id!: number;

  @ApiProperty({ description: 'User email address.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: 'Full display name of the user.', example: 'John Doe' })
  fullName!: string;

  @ApiProperty({
    description: 'Numeric user role. 1 = Admin, 2 = User.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.User,
  })
  role!: UserRole;

  @ApiProperty({ description: 'Timestamp when the user was created.', example: '2026-05-12T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the user was last updated.', example: '2026-05-12T11:00:00Z' })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Timestamp of the user last successful login, or null if the user never logged in.',
    example: '2026-05-20T10:00:00Z',
    nullable: true,
  })
  lastLoginAt!: Date | null;
}
