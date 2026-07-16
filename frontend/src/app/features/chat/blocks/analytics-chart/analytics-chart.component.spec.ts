import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsChartComponent, AnalyticsChartRenderData } from './analytics-chart.component';

describe('AnalyticsChartComponent', () => {
    let component: AnalyticsChartComponent;
    let fixture: ComponentFixture<AnalyticsChartComponent>;

    const sampleData: AnalyticsChartRenderData = {
        chartType: 1,
        title: 'Request Volume',
        summary: 'Total requests this week',
        maxValue: 500,
        series: [
            { label: 'Mon', value: 120 },
            { label: 'Tue', value: 350 },
            { label: 'Wed', value: 280 },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AnalyticsChartComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AnalyticsChartComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display title', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Request Volume');
    });

    it('should display summary', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Total requests this week');
    });

    it('should render bar chart for type 1', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.bar-chart')).toBeTruthy();
        const bars = el.querySelectorAll('.bar');
        expect(bars.length).toBe(3);
    });

    it('should render line chart for type 2', () => {
        fixture.componentRef.setInput('data', { ...sampleData, chartType: 2 });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.line-chart')).toBeTruthy();
        expect(el.querySelector('.line')).toBeTruthy();
    });

    it('should render pie chart for type 3', () => {
        fixture.componentRef.setInput('data', { ...sampleData, chartType: 3 });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.pie-circle')).toBeTruthy();
        expect(el.querySelector('.pie-legend')).toBeTruthy();
    });

    it('should show empty state when no series', () => {
        fixture.componentRef.setInput('data', { chartType: 1, title: 'Empty' });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.empty-state')).toBeTruthy();
    });
});
