import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Query options for GET /ideas/sessions. Both flags are optional and arrive as
 * query-string booleans ("1"/"true"/"0"/"false"), normalized by `@Transform`.
 */
export class ListSessionsQueryDto {
  @ApiPropertyOptional({
    description: 'When "true", return only nightly cron-generated sessions. Returns all sessions otherwise.',
    example: 'false',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  nightly?: boolean;

  @ApiPropertyOptional({
    description: 'When "true", return only sessions that contain at least one favorited idea. Returns all sessions otherwise.',
    example: 'false',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  favorites?: boolean;
}
