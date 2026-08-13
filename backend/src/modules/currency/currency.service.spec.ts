import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { CurrencyService } from './currency.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let httpService: { get: jest.Mock };

  const mockRatesResponse: AxiosResponse = {
    data: {
      result: 'success',
      base_code: 'USD',
      time_last_update_utc: '2025-01-15T00:00:00Z',
      rates: { USD: 1, EUR: 0.85, ILS: 3.6 },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(CurrencyService);
    jest.clearAllMocks();
  });

  describe('getRates', () => {
    it('returns rates on success', async () => {
      httpService.get.mockReturnValueOnce(of(mockRatesResponse));

      const result = await service.getRates('USD');

      expect(result.success).toBe(true);
      expect(result.result?.base).toBe('USD');
      expect(result.result?.rates).toEqual({ USD: 1, EUR: 0.85, ILS: 3.6 });
    });

    it('returns error when API response is invalid', async () => {
      httpService.get.mockReturnValueOnce(of({
        ...mockRatesResponse,
        data: { result: 'error', 'error-type': 'invalid-base' },
      }));

      const result = await service.getRates('INVALID');

      expect(result.success).toBe(false);
    });

    it('returns error when API call fails', async () => {
      httpService.get.mockReturnValueOnce(throwError(() => new Error('Network error')));

      const result = await service.getRates('USD');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to reach the external exchange-rate service');
    });
  });

  describe('convert', () => {
    it('returns converted amount on success', async () => {
      httpService.get.mockReturnValueOnce(of(mockRatesResponse));

      const result = await service.convert('USD', 'EUR', 100);

      expect(result.success).toBe(true);
      expect(result.result?.from).toBe('USD');
      expect(result.result?.to).toBe('EUR');
      expect(result.result?.amount).toBe(100);
      expect(result.result?.rate).toBe(0.85);
      expect(result.result?.result).toBe(85);
    });

    it('returns error for unsupported currency', async () => {
      httpService.get.mockReturnValueOnce(of(mockRatesResponse));

      const result = await service.convert('USD', 'XYZ', 100);

      expect(result.success).toBe(false);
      expect(result.message).toContain('XYZ');
    });

    it('returns error when API call fails', async () => {
      httpService.get.mockReturnValueOnce(throwError(() => new Error('Network error')));

      const result = await service.convert('USD', 'EUR', 100);

      expect(result.success).toBe(false);
    });
  });
});
