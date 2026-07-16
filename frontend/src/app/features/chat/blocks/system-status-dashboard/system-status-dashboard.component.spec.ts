import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemStatusDashboardComponent, SystemStatusRenderData } from './system-status-dashboard.component';

describe('SystemStatusDashboardComponent', () => {
    let component: SystemStatusDashboardComponent;
    let fixture: ComponentFixture<SystemStatusDashboardComponent>;

    const sampleData: SystemStatusRenderData = {
        totalUsers: 150,
        activeSessions: 12,
        swaggerStatus: 'up',
        uptime: 86400,
        nodeVersion: '22.22.3',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SystemStatusDashboardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SystemStatusDashboardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display total users', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('150');
    });

    it('should display active sessions', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('12');
    });

    it('should display swagger status', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('up');
    });

    it('should display formatted uptime', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('24h 0m');
    });

    it('should display node version', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('22.22.3');
    });

    it('should apply status-up class when swagger is up', () => {
        const el = fixture.nativeElement as HTMLElement;
        const icon = el.querySelector('.status-up');
        expect(icon).toBeTruthy();
    });

    it('should apply status-down class when swagger is down', () => {
        fixture.componentRef.setInput('data', { ...sampleData, swaggerStatus: 'down' });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const icon = el.querySelector('.status-down');
        expect(icon).toBeTruthy();
    });

    it('should render bar chart', () => {
        const el = fixture.nativeElement as HTMLElement;
        const bars = el.querySelectorAll('.bar-row');
        expect(bars.length).toBe(2);
    });
});
