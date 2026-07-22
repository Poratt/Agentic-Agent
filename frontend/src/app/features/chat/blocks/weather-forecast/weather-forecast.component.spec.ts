import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeatherForecastComponent, WeatherForecastRenderData } from './weather-forecast.component';

describe('WeatherForecastComponent', () => {
    let component: WeatherForecastComponent;
    let fixture: ComponentFixture<WeatherForecastComponent>;

    const sampleData: WeatherForecastRenderData = {
        location: 'Tel Aviv',
        forecast: [
            { dayName: 'Mon', maxTempC: 28, minTempC: 20, humidity: 65, weatherEmoji: '☀️' },
            { dayName: 'Tue', maxTempC: 30, minTempC: 22, humidity: 55, weatherEmoji: '⛅' },
            { dayName: 'Wed', maxTempC: 26, minTempC: 19, humidity: 70, weatherEmoji: '🌧️' },
            { dayName: 'Thu', maxTempC: 25, minTempC: 18, humidity: 75, weatherEmoji: '⛈️' },
            { dayName: 'Fri', maxTempC: 29, minTempC: 21, humidity: 60, weatherEmoji: '☀️' },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WeatherForecastComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WeatherForecastComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display location', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Tel Aviv');
    });

    it('should render all forecast cards', () => {
        const el = fixture.nativeElement as HTMLElement;
        const cards = el.querySelectorAll('.forecast-tile');
        expect(cards.length).toBe(5);
    });

    it('should display day names', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Mon');
        expect(el.textContent).toContain('Fri');
    });

    it('should display temperatures', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('28°');
        expect(el.textContent).toContain('20°');
    });
});
