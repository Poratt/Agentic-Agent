import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UsersListResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Users retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Public user response list.', type: [UserResponseDto] })
  result!: UserResponseDto[];
}
