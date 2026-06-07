import { ApiProperty } from '@nestjs/swagger';

export class SystemStatusDto {
  @ApiProperty({
    description: 'Total number of users in the system.',
    example: 12,
  })
  totalUsers!: number;

  @ApiProperty({
    description: 'Total number of chat sessions in the system.',
    example: 34,
  })
  activeSessions!: number;

  @ApiProperty({
    description: 'Whether swagger-spec.json currently exists.',
    example: true,
  })
  isSwaggerUpToDate!: boolean;
}
