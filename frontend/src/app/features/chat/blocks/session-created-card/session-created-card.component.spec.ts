import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionCreatedCardComponent, SessionCreatedRenderData } from './session-created-card.component';

describe('SessionCreatedCardComponent', () => {
    let component: SessionCreatedCardComponent;
    let fixture: ComponentFixture<SessionCreatedCardComponent>;

    const sampleData: SessionCreatedRenderData = {
        id: 7,
        title: 'Support ticket',
        createdAt: '2026-07-15T10:00:00Z',
        updatedAt: '2026-07-15T10:05:00Z',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SessionCreatedCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SessionCreatedCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display id', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('7');
    });

    it('should display title', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Support ticket');
    });

    it('should display createdAt', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('2026-07-15T10:00:00Z');
    });

    it('should display updatedAt', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('2026-07-15T10:05:00Z');
    });

    it('should show success badge', () => {
        const el = fixture.nativeElement as HTMLElement;
        const badge = el.querySelector('.badge.badge-success');
        expect(badge).toBeTruthy();
    });
});
