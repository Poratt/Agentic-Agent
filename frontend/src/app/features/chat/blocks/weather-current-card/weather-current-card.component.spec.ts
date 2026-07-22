import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeatherCurrentCardComponent, WeatherCurrentRenderData } from './weather-current-card.component';

describe('WeatherCurrentCardComponent', () => {
    let component: WeatherCurrentCardComponent;
    let fixture: ComponentFixture<WeatherCurrentCardComponent>;

    const sampleData: WeatherCurrentRenderData = {
        location: 'Tel Aviv, Israel',
        tempC: 28,
        feelsLikeC: 31,
        humidity: 65,
        windSpeedKmph: 18,
        windDirection: 'NW',
        uvIndex: 7,
        cloudCover: 30,
        precipitationMm: 0,
        pressure: 1013,
        visibility: 10,
        weatherDesc: 'Partly Cloudy',
        weatherEmoji: '\u26C5',
        observationTime: '2026-07-15T14:00:00Z',
        requestLocalTime: '17:00 Israel Time',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WeatherCurrentCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WeatherCurrentCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render weather description', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.weather-desc')?.textContent).toContain('Partly Cloudy');
    });

    it('should render temperature', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.temp-value')?.textContent).toContain('28');
    });

    it('should render weather emoji', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.weather-emoji')?.textContent).toContain('\u26C5');
    });

    it('should render location', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.weather-location')?.textContent).toContain('Tel Aviv');
    });

    it('should render detail chips', () => {
        const el = fixture.nativeElement as HTMLElement;
        const chips = el.querySelectorAll('.detail-tile');
        expect(chips.length).toBe(7);
    });

    it('should render feels like temperature', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.feels-like')?.textContent).toContain('31');
    });

    it('should hide missing values', () => {
        fixture.componentRef.setInput('data', { tempC: 20 });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const chips = el.querySelectorAll('.detail-tile');
        expect(chips.length).toBe(0);
        expect(el.querySelector('.weather-location')).toBeNull();
    });
});
