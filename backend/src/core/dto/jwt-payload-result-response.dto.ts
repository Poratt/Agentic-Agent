import { ApiProperty } from '@nestjs/swagger';
import { JwtPayloadResponseDto } from './jwt-payload-response.dto';

export class JwtPayloadResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'Current user retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Decoded JWT payload.', type: JwtPayloadResponseDto })
  result!: JwtPayloadResponseDto;
}
