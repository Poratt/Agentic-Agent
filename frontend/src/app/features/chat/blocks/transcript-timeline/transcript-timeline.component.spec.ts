import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranscriptTimelineComponent, TranscriptRenderData } from './transcript-timeline.component';

describe('TranscriptTimelineComponent', () => {
    let component: TranscriptTimelineComponent;
    let fixture: ComponentFixture<TranscriptTimelineComponent>;

    const sampleData: TranscriptRenderData = {
        sessionId: 7,
        messages: [
            { role: 'user', content: 'Hello, how are you?', createdAt: '2025-07-10T10:00:00Z' },
            { role: 'assistant', content: 'I am doing well, thank you!', createdAt: '2025-07-10T10:00:05Z' },
        ],
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TranscriptTimelineComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TranscriptTimelineComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', sampleData);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display session id', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Session 7');
    });

    it('should render all messages', () => {
        const el = fixture.nativeElement as HTMLElement;
        const messages = el.querySelectorAll('.message-bubble');
        expect(messages.length).toBe(2);
    });

    it('should display user message content', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Hello, how are you?');
    });

    it('should display assistant message content', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('I am doing well, thank you!');
    });

    it('should apply user class to user messages', () => {
        const el = fixture.nativeElement as HTMLElement;
        const userRow = el.querySelector('.message-row.user');
        expect(userRow).toBeTruthy();
    });

    it('should apply assistant class to assistant messages', () => {
        const el = fixture.nativeElement as HTMLElement;
        const assistantRow = el.querySelector('.message-row.assistant');
        expect(assistantRow).toBeTruthy();
    });
});
