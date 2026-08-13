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
      providers: [
        WebSearchService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
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
        providers: [
          WebSearchService,
          { provide: HttpService, useValue: httpService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const freshService = module.get(WebSearchService);
      const result = await freshService.search('query');

      expect(result.success).toBe(false);
      expect(result.message).toContain('SEARXNG_URL');
    });
  });
});
