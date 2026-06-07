import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { CurrencyConversionResponseDto } from './dto/currency-conversion-response.dto';
import { CurrencyRatesResponseDto } from './dto/currency-rates-response.dto';

type ExchangeRateApiResponse = {
  result?: string;
  base_code?: string;
  time_last_update_utc?: string;
  time_last_update_unix?: number;
  rates?: Record<string, number>;
  ['error-type']?: string;
};

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly httpService: HttpService) {}

  async getRates(base: string): Promise<ServiceResultContainer<CurrencyRatesResponseDto | null>> {
    const response = await this.fetchRates(base);

    if (!response.success || !response.result) {
      return response;
    }

    return {
      success: true,
      message: `Currency rates for ${response.result.base} retrieved successfully`,
      result: response.result,
    };
  }

  async convert(
    from: string,
    to: string,
    amount: number,
  ): Promise<ServiceResultContainer<CurrencyConversionResponseDto | null>> {
    const response = await this.fetchRates(from);

    if (!response.success || !response.result) {
      return {
        success: false,
        message: response.message,
        result: null,
      };
    }

    const rate = response.result.rates[to];

    if (typeof rate !== 'number') {
      return {
        success: false,
        message: `Currency code ${to} is not supported by the exchange-rate provider`,
        result: null,
      };
    }

    const result = Number((amount * rate).toFixed(2));

    return {
      success: true,
      message: `Converted ${amount} ${from} to ${to} successfully`,
      result: {
        from,
        to,
        amount,
        rate,
        result,
        date: response.result.date,
      },
    };
  }

  private async fetchRates(base: string): Promise<ServiceResultContainer<CurrencyRatesResponseDto | null>> {
    try {
      const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
      const response = await firstValueFrom(this.httpService.get<ExchangeRateApiResponse>(url));
      const data = response.data;

      if (data.result !== 'success' || !data.rates || !data.base_code) {
        return {
          success: false,
          message: data['error-type'] || 'Exchange-rate provider returned an invalid response',
          result: null,
        };
      }

      return {
        success: true,
        message: 'Currency rates retrieved successfully',
        result: {
          base: data.base_code,
          date: this.getProviderDate(data),
          rates: data.rates,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch currency rates: ${error.message}`);
      return {
        success: false,
        message: 'Failed to reach the external exchange-rate service',
        result: null,
      };
    }
  }

  private getProviderDate(data: ExchangeRateApiResponse): string {
    if (data.time_last_update_utc) {
      return data.time_last_update_utc;
    }

    if (data.time_last_update_unix) {
      return new Date(data.time_last_update_unix * 1000).toISOString();
    }

    return new Date().toISOString();
  }
}
