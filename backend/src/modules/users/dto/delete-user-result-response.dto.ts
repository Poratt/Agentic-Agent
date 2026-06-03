import { ApiProperty } from '@nestjs/swagger';

class DeleteUserPayloadDto {
  @ApiProperty({ description: 'True when the user was deleted.', example: true })
  deleted!: boolean;
}

export class DeleteUserResultResponseDto {
  @ApiProperty({ description: 'Whether the request succeeded.', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Human-readable result message.', example: 'User deleted successfully' })
  message!: string;

  @ApiProperty({ description: 'Deletion result payload.', type: DeleteUserPayloadDto })
  result!: DeleteUserPayloadDto;
}
