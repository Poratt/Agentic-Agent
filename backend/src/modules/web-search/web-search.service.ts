import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { WebSearchResultDto } from './dto/web-search-result.dto';

type SearXNGResult = {
  title: string;
  url: string;
  content: string;
};

type SearXNGResponse = {
  query?: string;
  number_of_results?: number;
  results?: SearXNGResult[];
  answers?: string[];
};

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SEARXNG_URL', '').replace(/\/+$/, '');
    this.apiKey = this.configService.get<string>('SEARXNG_API_KEY', '');
    if (!this.baseUrl) {
      this.logger.warn('SEARXNG_URL is not set — web search will fail.');
    }
  }

  async search(query: string): Promise<ServiceResultContainer<WebSearchResultDto | null>> {
    if (!this.baseUrl) {
      return {
        success: false,
        message: 'SEARXNG_URL is not configured on the server',
        result: null,
      };
    }

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response$ = this.httpService.get<SearXNGResponse>(
        `${this.baseUrl}/search`,
        {
          params: {
            q: query,
            format: 'json',
            categories: 'general',
          },
          headers,
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

      const answer = data.answers && data.answers.length ? data.answers[0] : undefined;

      this.logger.debug(`[SearXNG] Query: "${query}"`);
      this.logger.debug(`[SearXNG] Answer: ${answer || '(none)'}`);
      this.logger.debug(`[SearXNG] Results: ${results.length}`);
      for (const r of results) {
        this.logger.debug(`  - ${r.title}: ${r.content.slice(0, 150)}...`);
      }

      return {
        success: true,
        message: `נמצאו ${results.length} תוצאות עבור "${query}"`,
        result: {
          query,
          results,
          answer,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SearXNG search failed: ${msg}`);
      return {
        success: false,
        message: 'שגיאה בפנייה לשירות חיפוש הרשת',
        result: null,
      };
    }
  }
}
