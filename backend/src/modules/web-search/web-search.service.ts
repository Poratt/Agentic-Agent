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

type HnHit = {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
};

type HnSearchResponse = {
  hits?: HnHit[];
};

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  /**
   * נקודות קצה ישירות ללא מפתח עבור מקורות אות מהימנים. SearXNG מאוחסן
   * עצמית נחסם במהירות על ידי ddg/google/brave/startpage (CAPTCHA
   * "/Suspended: too many requests") ולכן לא מספיק לבד עבור ה-cron הלילי
   * של הרעיונות. HN Algolia הוא API ציבורי ללא bot-detection. PullPush
   * (ארכיון Reddit) הוסר — ה-API מחזיר 429 קבוע "does not provide free
   * scraping resources for agents" מאז 2026-08.
   */
  private readonly HN_ALGOLIA_URL = 'https://hn.algolia.com/api/v1/search';

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
  private simplifyQuery(rawQuery: string, preserveHebrew = false): string {
    // 1. הסר טקסט בעברית — למעט קריאות שמבקשות לשמרו (העשרת זנים/טרפנים: שם הזן בעברית הוא מונח החיפוש המרכזי)
    const withoutHebrew = preserveHebrew ? rawQuery : rawQuery.replace(/[֐-׿]+/g, '');

    // 2. קצר גרשיים על ביטויים ארוכים (>30 תווים) ל-4 מילים ראשונות
    const withoutLongQuotes = withoutHebrew.replace(/"([^"]{30,})"/g, (_match, inner: string) => {
      const words = inner.trim().split(/\s+/).slice(0, 4);
      return `"${words.join(' ')}"`;
    });

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

  /**
   * מפרשת אופרטורי `site:` ו-`-site:` מהשאילתה המקורית. SearXNG מעביר
   * את השאילתה גולמית לכל מנוע והאכיפה תלויה במנוע עצמו — bing מתעלם
   * מהאופרטור לחלוטין לתנועה אנונימית (נבדק חי 2026-08: bing.com החזיר
   * speedtest.net עבור site:reddit.com), בזמן ש-google cse ו-brave מכבדים
   * אותו, ומיזוג התוצאות של SearXNG מערבב את שניהם. לכן האופרטורים
   * נאכפים כאן על התוצאות הממוזגות. תומך במספר אופרטורים, גם בתוך
   * סוגריים.
   */
  private parseSiteOperators(query: string): { requiredHosts: string[]; excludedHosts: string[] } {
    const requiredHosts: string[] = [];
    const excludedHosts: string[] = [];
    for (const match of query.matchAll(/(^|[\s(])(-?)site:([^\s()"]+)/gi)) {
      const host = match[3].replace(/[.,;:]+$/, '').toLowerCase();
      if (host) {
        (match[2] === '-' ? excludedHosts : requiredHosts).push(host);
      }
    }
    return { requiredHosts, excludedHosts };
  }

  /**
   * בודק אם כתובת שייכת לדומיין של אופרטור site: — התאמה מדויקת או
   * subdomain (www.reddit.com תואם site:reddit.com). כתובת לא חוקית
   * לא תעבור סינון חיובי.
   */
  private urlMatchesSite(url: string, host: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname === host || hostname.endsWith(`.${host}`);
    } catch {
      return false;
    }
  }

  /**
   * מנקה שאילתה לפני שליחה ל-APIs ישירים (HN Algolia). ה-APIs
   * האלה מחפשים טקסט מילולי ולא מבינים תחביר מנועי חיפוש — `site:`,
   * `OR`, מינוס וגרשיים הופכים לטוקנים חסרי משמעות שמאפסים את התוצאות.
   * משאירה רק את מילות המפתח עצמן.
   */
  private toDirectApiQuery(rawQuery: string): string {
    const cleaned = rawQuery
      .replace(/\b(site|domain):[^\s"]+(?:"[^"]*")?/gi, ' ')
      .replace(/(^|\s)-[^\s"]*/g, '$1')
      .replace(/\bOR\b/gi, ' ')
      .replace(/[()[\]"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      // שאילתה שכולה הייתה אופרטורים — מחזירים את המקור כדי שלא לחסום את הערוץ
      return rawQuery;
    }

    return cleaned;
  }

  async search(query: string, preserveHebrew = false): Promise<ServiceResultContainer<WebSearchResultDto | null>> {
    if (!this.baseUrl) {
      return {
        success: false,
        message: 'SEARXNG_URL is not configured on the server',
        result: null,
      };
    }

    const cleanQuery = this.simplifyQuery(query, preserveHebrew);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response$ = this.httpService.get<SearXNGResponse>(`${this.baseUrl}/search`, {
        params: {
          q: cleanQuery,
          format: 'json',
          categories: 'general',
          language: 'en',
        },
        headers,
        timeout: 10_000,
      });

      const response = await firstValueFrom(response$);
      const data = response.data;

      // אכיפת site:/-site: על התוצאות הממוזגות — ראה parseSiteOperators.
      const { requiredHosts, excludedHosts } = this.parseSiteOperators(query);
      const results = (data.results ?? [])
        .map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        }))
        .filter(
          (r) => requiredHosts.every((host) => this.urlMatchesSite(r.url, host)) && !excludedHosts.some((host) => this.urlMatchesSite(r.url, host)),
        );

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

  /**
   * חיפוש סיפורי Hacker News דרך ה-API הציבורי של Algolia (ללא מפתח,
   * ללא bot-detection). מחזיר קישורים לדיון ב-news.ycombinator.com כך
   * שכל התוצאות עוברות את סינון הדומיינים המהימנים ב-IdeasService.
   */
  async searchHackerNews(rawQuery: string): Promise<ServiceResultContainer<WebSearchResultDto | null>> {
    // HN Algolia מצרף את המילים ב-AND — שאילתות ארוכות של 8-10 מילות מפתח
    // מחזירות 0 תוצאות. שתי מילים-שלוש ראשונות עובדות מצוין (נבדק חי:
    // "abandoned cart" → 5 סיפורים רלוונטיים). כל תוצאה היא news.ycombinator.com
    // ולכן עוברת את סינון הדומיינים המהימנים.
    const cleaned = this.toDirectApiQuery(rawQuery);
    const shortQuery =
      cleaned
        .split(' ')
        .filter((w) => /^[a-z0-9]{3,}$/i.test(w))
        .slice(0, 3)
        .join(' ') || cleaned;
    const query = shortQuery;
    try {
      const response$ = this.httpService.get<HnSearchResponse>(this.HN_ALGOLIA_URL, {
        params: { query, hitsPerPage: 25, tags: 'story' },
        headers: { Accept: 'application/json' },
        timeout: 10_000,
      });
      const { data } = await firstValueFrom(response$);

      const results = (data.hits ?? [])
        .filter((h) => h.title || h.story_title)
        .map((h) => ({
          title: h.title ?? h.story_title ?? '',
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          content: (h.story_text || h.comment_text || h.title || '').slice(0, 500),
        }));

      this.logger.debug(`[HN Algolia] Query: "${query}" → ${results.length} results`);

      return {
        success: true,
        message: `נמצאו ${results.length} תוצאות עבור "${query}" ב-Hacker News`,
        result: { query, results },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`HN Algolia search failed: ${msg}`);
      return { success: false, message: 'שגיאה בפנייה ל-HN Algolia', result: null };
    }
  }
}
