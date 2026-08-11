import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Body for PATCH /ideas/ideas/:id — toggles the favorite flag on a saved idea.
 */
export class SetFavoriteDto {
  @ApiProperty({
    description: 'Target favorite state for the idea. True marks it as a favorite, false clears the mark.',
    example: true,
  })
  @IsBoolean()
  isFavorite!: boolean;
}
