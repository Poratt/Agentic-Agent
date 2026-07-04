import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { WebSearchResultDto } from './dto/web-search-result.dto';

type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

type TavilyResponse = {
  results: TavilyResult[];
  answer?: string;
};

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('TAVILY_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn('TAVILY_API_KEY is not set — web search will fail.');
    }
  }

  async search(query: string): Promise<ServiceResultContainer<WebSearchResultDto | null>> {
    if (!this.apiKey) {
      return {
        success: false,
        message: 'TAVILY_API_KEY is not configured on the server',
        result: null,
      };
    }

    try {
      const response$ = this.httpService.post<TavilyResponse>(
        'https://api.tavily.com/search',
        {
          api_key: this.apiKey,
          query,
          max_results: 5,
          include_answer: true,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10_000,
        },
      );

      const response = await firstValueFrom(response$);
      const data = response.data;

      const results = (data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      }));

      return {
        success: true,
        message: `נמצאו ${results.length} תוצאות עבור "${query}"`,
        result: {
          query,
          results,
          answer: data.answer,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Tavily search failed: ${msg}`);
      return {
        success: false,
        message: 'שגיאה בפנייה לשירות חיפוש הרשת',
        result: null,
      };
    }
  }
}
