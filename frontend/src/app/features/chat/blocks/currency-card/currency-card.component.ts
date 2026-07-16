import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CurrencyRenderData {
    sourceCurrency?: string;
    targetCurrency?: string;
    amount?: number;
    convertedAmount?: number;
    rate?: number;
    lastUpdated?: string;
    rates?: Record<string, number>;
    mode?: 'convert' | 'rates';
}

const CURRENCY_FLAG_MAP: Record<string, string> = {
    USD: 'us',
    ILS: 'il',
    EUR: 'eu',
    GBP: 'gb',
    JPY: 'jp',
    CAD: 'ca',
    AUD: 'au',
    CHF: 'ch',
    SEK: 'se',
    NZD: 'nz',
    MXN: 'mx',
    BRL: 'br',
    INR: 'in',
    KRW: 'kr',
    CNY: 'cn',
    RUB: 'ru',
    TRY: 'tr',
    ZAR: 'za',
    PLN: 'pl',
    NOK: 'no',
    DKK: 'dk',
    CZK: 'cz',
    HUF: 'hu',
    PHP: 'ph',
    THB: 'th',
    SGD: 'sg',
    HKD: 'hk',
    TWD: 'tw',
};

@Component({
    selector: 'app-currency-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './currency-card.component.html',
    styleUrl: './currency-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyCardComponent {
    data = input<CurrencyRenderData>({});

    isConvertMode = computed(() => this.data().mode !== 'rates');

    flagUrl = (code: string): string => {
        const cc = CURRENCY_FLAG_MAP[code?.toUpperCase()] ?? code?.toLowerCase();
        return `https://flagcdn.com/w40/${cc}.png`;
    };

    rateEntries = computed(() => {
        const rates = this.data().rates;
        if (!rates) return [];
        return Object.entries(rates);
    });
}
