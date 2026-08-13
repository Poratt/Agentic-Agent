import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyCardComponent, CurrencyRenderData } from './currency-card.component';

describe('CurrencyCardComponent', () => {
    let component: CurrencyCardComponent;
    let fixture: ComponentFixture<CurrencyCardComponent>;

    describe('conversion mode', () => {
        const convertData: CurrencyRenderData = {
            sourceCurrency: 'USD',
            targetCurrency: 'ILS',
            amount: 100,
            convertedAmount: 365.5,
            rate: 3.655,
            lastUpdated: '2026-07-15 14:00 UTC',
            mode: 'convert',
        };

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [CurrencyCardComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(CurrencyCardComponent);
            component = fixture.componentInstance;
            fixture.componentRef.setInput('data', convertData);
            fixture.detectChanges();
        });

        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should render currency codes', () => {
            const el = fixture.nativeElement as HTMLElement;
            const codes = el.querySelectorAll('.currency-code');
            expect(codes[0]?.textContent).toContain('USD');
            expect(codes[1]?.textContent).toContain('ILS');
        });

        it('should render converted amount', () => {
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.amount-value')?.textContent).toContain('365.50');
        });

        it('should render rate info', () => {
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.rate-info')?.textContent).toContain('3.655');
        });

        it('should render flag images', () => {
            const el = fixture.nativeElement as HTMLElement;
            const flags = el.querySelectorAll('.flag-img');
            expect(flags.length).toBe(2);
        });
    });

    describe('rates mode', () => {
        const ratesData: CurrencyRenderData = {
            sourceCurrency: 'USD',
            mode: 'rates',
            rates: {
                ILS: 3.655,
                EUR: 0.92,
                GBP: 0.79,
            },
            lastUpdated: '2026-07-15 14:00 UTC',
        };

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [CurrencyCardComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(CurrencyCardComponent);
            component = fixture.componentInstance;
            fixture.componentRef.setInput('data', ratesData);
            fixture.detectChanges();
        });

        it('should render rates title', () => {
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.rates-title')?.textContent).toContain('שערי חליפין');
        });

        it('should render rate rows', () => {
            const el = fixture.nativeElement as HTMLElement;
            const rows = el.querySelectorAll('.rate-row');
            expect(rows.length).toBe(3);
        });

        it('should render base currency', () => {
            const el = fixture.nativeElement as HTMLElement;
            expect(el.querySelector('.rates-base')?.textContent).toContain('USD');
        });

        it('should render rate values', () => {
            const el = fixture.nativeElement as HTMLElement;
            const values = el.querySelectorAll('.rate-value');
            expect(values[0]?.textContent).toContain('3.655');
        });
    });
});
