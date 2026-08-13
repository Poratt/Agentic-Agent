import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ChatMessage, ChatMessageStreamState } from './chat-message';
import { IChatMessage, IChatStep } from '../../../core/models/chat-message.interface';

describe('ChatMessage', () => {
    let component: ChatMessage;
    let fixture: ComponentFixture<ChatMessage>;

    const assistantMsg = (overrides: Partial<IChatMessage> = {}): IChatMessage => ({
        role: 'assistant',
        content: 'Hello world',
        ...overrides,
    });

    const userMsg = (overrides: Partial<IChatMessage> = {}): IChatMessage => ({
        role: 'user',
        content: 'Hi there',
        ...overrides,
    });

    const setup = (msg: IChatMessage, streamState: ChatMessageStreamState = 'idle', actionsDisabled = false) => {
        fixture = TestBed.createComponent(ChatMessage);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('message', msg);
        fixture.componentRef.setInput('streamState', streamState);
        fixture.componentRef.setInput('actionsDisabled', actionsDisabled);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChatMessage],
            providers: [provideZonelessChangeDetection()],
        }).compileComponents();
    });

    it('should create', () => {
        setup(assistantMsg());
        expect(component).toBeTruthy();
    });

    it('should set message input via setInput', () => {
        const msg = assistantMsg({ content: 'Test content' });
        setup(msg);
        expect(component.message().content).toBe('Test content');
    });

    describe('isAssistant / isUser', () => {
        it('should return true for isAssistant when role is assistant', () => {
            setup(assistantMsg());
            expect(component.isAssistant()).toBe(true);
            expect(component.isUser()).toBe(false);
        });

        it('should return true for isUser when role is user', () => {
            setup(userMsg());
            expect(component.isUser()).toBe(true);
            expect(component.isAssistant()).toBe(false);
        });
    });

    describe('canDelete', () => {
        it('should return true when message has id, not active stream, not disabled', () => {
            setup(assistantMsg({ id: 1 }), 'idle');
            expect(component.canDelete()).toBe(true);
        });

        it('should return false when message has no id', () => {
            setup(assistantMsg(), 'idle');
            expect(component.canDelete()).toBe(false);
        });

        it('should return false when stream is active', () => {
            setup(assistantMsg({ id: 1 }), 'streaming');
            expect(component.canDelete()).toBe(false);
        });

        it('should return false when actions disabled', () => {
            setup(assistantMsg({ id: 1 }), 'idle', true);
            expect(component.canDelete()).toBe(false);
        });
    });

    describe('canSendAgain', () => {
        it('should return true when idle and not disabled', () => {
            setup(assistantMsg());
            expect(component.canSendAgain()).toBe(true);
        });

        it('should return false when stream is active', () => {
            setup(assistantMsg(), 'streaming');
            expect(component.canSendAgain()).toBe(false);
        });

        it('should return false when actions disabled', () => {
            setup(assistantMsg(), 'idle', true);
            expect(component.canSendAgain()).toBe(false);
        });
    });

    describe('canEdit', () => {
        it('should return true for user messages when not disabled', () => {
            setup(userMsg());
            expect(component.canEdit()).toBe(true);
        });

        it('should return false for assistant messages', () => {
            setup(assistantMsg());
            expect(component.canEdit()).toBe(false);
        });

        it('should return false when actions disabled', () => {
            setup(userMsg(), 'idle', true);
            expect(component.canEdit()).toBe(false);
        });
    });

    describe('responseTimeLabel', () => {
        it('should return null when no responseTimeMs', () => {
            setup(assistantMsg());
            expect(component.responseTimeLabel()).toBeNull();
        });

        it('should format milliseconds when < 1000', () => {
            setup(assistantMsg({ responseTimeMs: 500 }));
            expect(component.responseTimeLabel()).toBe('500ms');
        });

        it('should format seconds when >= 1000', () => {
            setup(assistantMsg({ responseTimeMs: 3500 }));
            expect(component.responseTimeLabel()).toBe('3.5s');
        });

        it('should format exactly 1000ms as 1.0s', () => {
            setup(assistantMsg({ responseTimeMs: 1000 }));
            expect(component.responseTimeLabel()).toBe('1.0s');
        });
    });

    describe('steps', () => {
        it('should return empty array when no steps', () => {
            setup(assistantMsg());
            expect(component.steps()).toEqual([]);
        });

        it('should return steps from message', () => {
            const steps: IChatStep[] = [
                { icon: 'ph-magnifying-glass', message: 'Searching...' },
                { icon: 'ph-check-circle', message: 'Done' },
            ];
            setup(assistantMsg({ steps }));
            expect(component.steps().length).toBe(2);
            expect(component.steps()[0].icon).toBe('ph-magnifying-glass');
        });
    });

    describe('handleStreamEvent', () => {
        it('should add render block to pendingRenderBlocks', () => {
            setup(assistantMsg());
            component.handleStreamEvent({
                type: 'render',
                component: 'test-comp',
                data: { foo: 'bar' },
            });
            const blocks = component.pendingRenderBlocks();
            expect(blocks.length).toBe(1);
            expect(blocks[0].component).toBe('test-comp');
        });
    });

    describe('requestAction', () => {
        it('should emit actionRequested event', () => {
            setup(assistantMsg({ id: 1 }));
            const spy = vi.spyOn(component.actionRequested, 'emit');
            component.requestAction('delete');
            expect(spy).toHaveBeenCalledWith({
                action: 'delete',
                message: component.message(),
            });
        });

        it('should show copied state on copy action', () => {
            setup(assistantMsg({ id: 1 }));
            vi.useFakeTimers();
            component.requestAction('copy');
            expect(component.copied()).toBe(true);
            vi.advanceTimersByTime(1200);
            expect(component.copied()).toBe(false);
            vi.useRealTimers();
        });
    });

    describe('showCursor', () => {
        it('should return false when idle', () => {
            setup(assistantMsg());
            expect(component.showCursor()).toBe(false);
        });

        it('should return false when not assistant', () => {
            setup(userMsg());
            expect(component.showCursor()).toBe(false);
        });
    });

    describe('contentForDisplay', () => {
        it('should return message content when idle', () => {
            setup(assistantMsg({ content: 'final content' }));
            expect(component.contentForDisplay()).toBe('final content');
        });

        it('should return displayedContent during active stream', () => {
            setup(assistantMsg({ content: 'streaming...' }), 'streaming');
            expect(component.contentForDisplay()).toBe(component.displayedContent());
        });
    });

    describe('displaySteps', () => {
        it('should merge status steps with previous step', () => {
            const steps: IChatStep[] = [
                { icon: 'ph-magnifying-glass', message: 'Searching...' },
                { icon: 'ph-check-circle', message: '' },
            ];
            setup(assistantMsg({ steps }));
            const display = component.displaySteps();
            expect(display.length).toBe(1);
            expect(display[0].statusIcon).toBe('ph-check-circle');
        });

        it('should mark last step as loading during streaming with no status', () => {
            const steps: IChatStep[] = [
                { icon: 'ph-magnifying-glass', message: 'Searching...' },
            ];
            setup(assistantMsg({ steps }), 'streaming');
            const display = component.displaySteps();
            expect(display[0].isLoading).toBe(true);
        });
    });

    describe('isRenderingTemplate', () => {
        it('should return false for normal content', () => {
            setup(assistantMsg({ content: 'Hello world' }));
            expect(component.isRenderingTemplate()).toBe(false);
        });

        it('should return true when content has component fence', () => {
            setup(assistantMsg({ content: '```component\nsome code\n```' }), 'streaming');
            component.displayedContent.set('```component\nsome code\n```');
            expect(component.isRenderingTemplate()).toBe(true);
        });
    });

    describe('roleLabel', () => {
        it('should return Hebrew label for user', () => {
            setup(userMsg());
            expect(component.roleLabel()).toBe('אתה');
        });

        it('should return Hebrew label for assistant', () => {
            setup(assistantMsg());
            expect(component.roleLabel()).toBe('סוכן AI');
        });
    });

    describe('hasSteps', () => {
        it('should return false when no steps', () => {
            setup(assistantMsg());
            expect(component.hasSteps()).toBe(false);
        });

        it('should return true when has steps', () => {
            setup(assistantMsg({ steps: [{ icon: 'ph-search', message: 'Looking' }] }));
            expect(component.hasSteps()).toBe(true);
        });
    });
});
