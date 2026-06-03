import { ApiProperty } from '@nestjs/swagger';

class LogoutPayloadDto {
  @ApiProperty({ description: 'True when logout completed.', example: true })
  ok!: true;
}

export class LogoutResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Logged out successfully' })
  message!: string;

  @ApiProperty({ description: 'Logout result payload.', type: LogoutPayloadDto })
  result!: LogoutPayloadDto;
}
