import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WebSearchService } from './web-search.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('WebSearchService', () => {
  let service: WebSearchService;
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };

  const mockSearchResponse: AxiosResponse = {
    data: {
      query: 'test query',
      number_of_results: 2,
      results: [
        { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1' },
        { title: 'Result 2', url: 'https://example.com/2', content: 'Content 2' },
      ],
      answers: ['Sample answer'],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };

  beforeEach(async () => {
    httpService = { get: jest.fn() };
    configService = { get: jest.fn() };
    configService.get.mockImplementation((key: string, defaultVal: any) => {
      if (key === 'SEARXNG_URL') return 'https://searxng.example.com';
      if (key === 'SEARXNG_API_KEY') return 'test-api-key';
      return defaultVal;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSearchService, { provide: HttpService, useValue: httpService }, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get(WebSearchService);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('returns results from SearXNG on success', async () => {
      httpService.get.mockReturnValueOnce(of(mockSearchResponse));

      const result = await service.search('test query');

      expect(result.success).toBe(true);
      expect(result.result?.query).toBe('test query');
      expect(result.result?.results).toHaveLength(2);
      expect(result.result?.results[0].title).toBe('Result 1');
      expect(result.result?.answer).toBe('Sample answer');
      expect(httpService.get.mock.calls[0][1].params.language).toBe('en');
    });

    it('returns error when API call fails', async () => {
      httpService.get.mockReturnValueOnce(throwError(() => new Error('Network error')));

      const result = await service.search('failing query');

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
    });

    it('returns error when baseUrl is not configured', async () => {
      configService.get.mockImplementation((key: string, defaultVal: any) => {
        if (key === 'SEARXNG_URL') return '';
        return defaultVal;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [WebSearchService, { provide: HttpService, useValue: httpService }, { provide: ConfigService, useValue: configService }],
      }).compile();

      const freshService = module.get(WebSearchService);
      const result = await freshService.search('query');

      expect(result.success).toBe(false);
      expect(result.message).toContain('SEARXNG_URL');
    });

    it('strips Hebrew by default but preserves it when preserveHebrew is set', async () => {
      httpService.get.mockReturnValueOnce(of(mockSearchResponse));

      await service.search('אובמה ראנטז cannabis strain genetics parents origin');
      let call = httpService.get.mock.calls[0];
      expect(call[1].params.q).not.toContain('ראנטז');

      httpService.get.mockReturnValueOnce(of(mockSearchResponse));
      await service.search('אובמה ראנטז cannabis strain genetics parents origin', true);
      call = httpService.get.mock.calls[1];
      expect(call[1].params.q).toContain('אובמה ראנטז');
    });
  });

  describe('searchHackerNews', () => {
    it('maps HN Algolia hits to trusted-domain results', async () => {
      httpService.get.mockReturnValueOnce(
        of({
          data: {
            hits: [
              { objectID: 'h1', title: 'Ask HN: SaaS pain', story_text: 'story body' },
              { objectID: 'h2', story_title: 'Story from comment', comment_text: 'comment body' },
              { objectID: 'h3' },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      const result = await service.searchHackerNews('saas pain');

      expect(result.success).toBe(true);
      expect(result.result?.results).toHaveLength(2);
      expect(result.result?.results[0].url).toBe('https://news.ycombinator.com/item?id=h1');
      expect(result.result?.results[0].content).toBe('story body');
      expect(result.result?.results[1].title).toBe('Story from comment');
    });

    it('returns error when HN Algolia call fails', async () => {
      httpService.get.mockReturnValueOnce(throwError(() => new Error('Network error')));

      const result = await service.searchHackerNews('failing query');

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
    });

    it('strips site:/OR/quotes and shortens to 3 significant words for HN', async () => {
      httpService.get.mockReturnValueOnce(
        of({
          data: { hits: [] },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        } as AxiosResponse),
      );

      await service.searchHackerNews('site:reddit.com ecommerce "abandoned cart" OR "conversion"');

      const call = httpService.get.mock.calls[0];
      expect(call[1].params.query).toBe('ecommerce abandoned cart');
    });
  });

  describe('search site: operator enforcement', () => {
    const siteResponse = (results: { title: string; url: string }[]): AxiosResponse =>
      ({
        data: {
          query: 'q',
          results: results.map((r, i) => ({ ...r, content: `content ${i}` })),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }) as AxiosResponse;

    it('drops bing garbage and keeps only reddit.com results (incl. subdomains) for site:reddit.com', async () => {
      // מקרה מדויק מהחקירה החיה 2026-08-16: bing החזיר shopify/wikipedia
      // עבור site:reddit.com (...) בזמן ש-google cse החזיר reddit תקין.
      httpService.get.mockReturnValueOnce(
        of(
          siteResponse([
            { title: 'Shopify', url: 'https://www.shopify.com/' }, // bing
            { title: 'Reddit Etsy', url: 'https://www.reddit.com/r/Etsy/comments/1ov' }, // google cse
            { title: 'Wikipedia Shopify', url: 'https://en.wikipedia.org/wiki/Shopify' }, // bing
            { title: 'Reddit startups', url: 'https://www.reddit.com/r/startups/x' }, // google cse
            { title: 'Bare host', url: 'https://reddit.com/r/all' }, // exact-host match
          ]),
        ),
      );

      const result = await service.search('site:reddit.com (shopify amazon etsy) "losing money"');

      expect(result.success).toBe(true);
      expect(result.result?.results).toHaveLength(3);
      expect(result.result?.results.every((r) => new URL(r.url).hostname.endsWith('reddit.com'))).toBe(true);
    });

    it('keeps only indiehackers.com for site:indiehackers.com (chatgpt/openai dropped)', async () => {
      // מקרה מדויק מהחקירה: site:indiehackers.com "churn" החזיר TRT Spor
      // מ-bing בזמן ש-google cse החזיר indiehackers תקין.
      httpService.get.mockReturnValueOnce(
        of(
          siteResponse([
            { title: 'ChatGPT', url: 'https://chatgpt.com/' }, // bing
            { title: 'OpenAI', url: 'https://openai.com/index/chatgpt/' }, // bing
            { title: 'IH churn', url: 'https://www.indiehackers.com/post/churn-is-inevitable' }, // google cse
          ]),
        ),
      );

      const result = await service.search('site:indiehackers.com "churn"');

      expect(result.success).toBe(true);
      expect(result.result?.results).toHaveLength(1);
      expect(result.result?.results[0].url).toContain('indiehackers.com');
    });

    it('does not filter when no site: operator is present', async () => {
      httpService.get.mockReturnValueOnce(
        of(
          siteResponse([
            { title: 'A', url: 'https://a.com/1' },
            { title: 'B', url: 'https://b.com/2' },
          ]),
        ),
      );

      const result = await service.search('plain query');

      expect(result.success).toBe(true);
      expect(result.result?.results).toHaveLength(2);
    });

    it('excludes the -site: domain while keeping everything else', async () => {
      // שאילתה 5 מ-buildSignalQueries: -site:reddit.com אמור להרחיק את
      // reddit ולהשאיר את שאר הפורומים, לא להיחשב כמסנן חיובי.
      httpService.get.mockReturnValueOnce(
        of(
          siteResponse([
            { title: 'Reddit', url: 'https://www.reddit.com/r/x' },
            { title: 'Forum', url: 'https://forum.example.com/t/1' },
          ]),
        ),
      );

      const result = await service.search('niche forum "wish there was" -site:reddit.com');

      expect(result.success).toBe(true);
      expect(result.result?.results).toHaveLength(1);
      expect(result.result?.results[0].url).toContain('forum.example.com');
    });

    it('drops results with unparseable URLs when a site: filter is active', async () => {
      httpService.get.mockReturnValueOnce(
        of(
          siteResponse([
            { title: 'Junk', url: 'not-a-valid-url' },
            { title: 'Reddit', url: 'https://www.reddit.com/r/ok' },
          ]),
        ),
      );

      const result = await service.search('site:reddit.com test');

      expect(result.success).toBe(true);
      expect(result.result?.results).toHaveLength(1);
      expect(result.result?.results[0].url).toContain('reddit.com');
    });
  });
});
