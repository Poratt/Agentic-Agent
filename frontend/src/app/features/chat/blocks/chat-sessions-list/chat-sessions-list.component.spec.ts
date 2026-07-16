import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatSessionsListComponent, ChatSessionsRenderData } from './chat-sessions-list.component';

describe('ChatSessionsListComponent', () => {
    let component: ChatSessionsListComponent;
    let fixture: ComponentFixture<ChatSessionsListComponent>;

    const sampleData: ChatSessionsRenderData = {
        sessions: [
            { id: 1, title: 'First Chat', createdAt: '2026-07-10T08:00:00Z', updatedAt: '2026-07-15T12:00:00Z' },
            { id: 2, title: 'Second Chat', createdAt: '2026-07-12T09:00:00Z', updatedAt: '2026-07-14T10:00:00Z' },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChatSessionsListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatSessionsListComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display session titles', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('First Chat');
        expect(el.textContent).toContain('Second Chat');
    });

    it('should display session IDs', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('#1');
        expect(el.textContent).toContain('#2');
    });

    it('should sort by updatedAt desc', () => {
        const el = fixture.nativeElement as HTMLElement;
        const rows = el.querySelectorAll('.session-row');
        expect(rows[0].textContent).toContain('First Chat');
        expect(rows[1].textContent).toContain('Second Chat');
    });

    it('should show empty state when no sessions', () => {
        fixture.componentRef.setInput('data', { sessions: [] });
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.empty-state')).toBeTruthy();
    });

    it('should show empty state when sessions is undefined', () => {
        fixture.componentRef.setInput('data', {});
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('.empty-state')).toBeTruthy();
    });
});
