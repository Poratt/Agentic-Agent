import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UserResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'User retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Public user response payload.', type: UserResponseDto })
  result!: UserResponseDto;
}
