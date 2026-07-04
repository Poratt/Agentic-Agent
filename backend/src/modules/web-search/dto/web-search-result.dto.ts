import { ApiProperty } from '@nestjs/swagger';

export class WebSearchResultItemDto {
  @ApiProperty({ description: 'Page title' })
  title!: string;

  @ApiProperty({ description: 'Page URL' })
  url!: string;

  @ApiProperty({ description: 'Relevant snippet from the page' })
  content!: string;
}

export class WebSearchResultDto {
  @ApiProperty({ description: 'The original search query' })
  query!: string;

  @ApiProperty({ description: 'Search results from the web', type: [WebSearchResultItemDto] })
  results!: WebSearchResultItemDto[];

  @ApiProperty({ description: 'AI-generated answer based on search results', required: false })
  answer?: string;
}
