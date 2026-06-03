import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

export class JwtPayloadResponseDto {
  @ApiProperty({ description: 'Authenticated user id from the JWT subject.', example: 1 })
  sub!: number;

  @ApiProperty({ description: 'Authenticated user email from the JWT payload.', example: 'user@example.com' })
  email!: string;

  @ApiProperty({
    description: 'Numeric user role from the JWT payload. 1 = Admin, 2 = User.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.User,
  })
  role!: UserRole;

  @ApiProperty({ description: 'JWT issued-at timestamp in seconds.', example: 1770000000 })
  iat!: number;

  @ApiProperty({ description: 'JWT expiry timestamp in seconds.', example: 1770000900 })
  exp!: number;
}
