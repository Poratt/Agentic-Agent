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

  /**
   * מפשטת שאילתת חיפוש מורכבת לשאילתה נקייה ש-SearXNG יודע לעכל.
   * מסירה טקסט בעברית, גרשיים על ביטויים ארוכים, ומילות קישור מיותרות.
   */
  private simplifyQuery(rawQuery: string): string {
    // 1. הסר טקסט בעברית
    const withoutHebrew = rawQuery.replace(/[֐-׿]+/g, '');

    // 2. קצר גרשיים על ביטויים ארוכים (>30 תווים) ל-4 מילים ראשונות
    const withoutLongQuotes = withoutHebrew.replace(
      /"([^"]{30,})"/g,
      (_match, inner: string) => {
        const words = inner.trim().split(/\s+/).slice(0, 4);
        return `"${words.join(' ')}"`;
      },
    );

    // 3. הסר סימנים ומילות קישור
    const cleaned = withoutLongQuotes
      .replace(/[–—|]/g, ' ')
      .replace(/\b(for|the|and|or|with|of|a|an)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 4. Fallback: אם נותר מעט מדי, החזר מקור
    if (cleaned.split(/\s+/).length < 2) {
      return rawQuery;
    }

    this.logger.debug(`[QueryRewrite] "${rawQuery.slice(0, 80)}..." → "${cleaned}"`);
    return cleaned;
  }

  async search(query: string): Promise<ServiceResultContainer<WebSearchResultDto | null>> {
    if (!this.baseUrl) {
      return {
        success: false,
        message: 'SEARXNG_URL is not configured on the server',
        result: null,
      };
    }

    const cleanQuery = this.simplifyQuery(query);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response$ = this.httpService.get<SearXNGResponse>(
        `${this.baseUrl}/search`,
        {
          params: {
            q: cleanQuery,
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
