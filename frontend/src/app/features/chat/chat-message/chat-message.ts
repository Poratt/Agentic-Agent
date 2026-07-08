import { CommonModule } from '@angular/common';
import {
    Component,
    OnDestroy,
    computed,
    effect,
    input,
    output,
    signal,
    untracked,
    ChangeDetectionStrategy,
} from '@angular/core';
import { IChatMessage } from '../../../core/models/chat-message.interface';
import { AiFormat } from '../../../core/directives/ai-format.directive';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';

export type ChatMessageStreamState = 'idle' | 'streaming' | 'completed' | 'errored';
export type ChatMessageAction = 'delete' | 'sendAgain' | 'copy' | 'edit';
export type ChatMessageActionEvent = {
    action: ChatMessageAction;
    message: IChatMessage;
};
type ChatMessageRowState = 'idle' | 'thinking' | 'typing' | 'complete';
type ChatDisplayStep = {
    icon: string;
    message: string;
    statusIcon?: string;
};

const MIN_VISIBLE_TICK_MS = 16;
const TINY_FLUSH_QUEUE_LENGTH = 12;
const BASE_CHARACTER_DELAY_MS = 18;
const CHARACTER_DELAY_JITTER_MS = 17;

@Component({
    selector: 'app-chat-message',
    standalone: true,
    imports: [CommonModule, AiFormat, AutoScrollBottomDirective],
    templateUrl: './chat-message.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './chat-message.css',
})
export class ChatMessage implements OnDestroy {
    message = input.required<IChatMessage>();
    streamState = input<ChatMessageStreamState>('idle');
    actionsDisabled = input(false);
    actionRequested = output<ChatMessageActionEvent>();

    private queuedText = '';
    private typeTimer?: ReturnType<typeof setTimeout>;
    private copiedTimer?: ReturnType<typeof setTimeout>;
    private lastCanonicalLength = 0;
    private currentWordDelay = this.nextCharacterDelay();

    displayedContent = signal('');
    rowState = signal<ChatMessageRowState>('idle');
    hasQueuedText = signal(false);
    copied = signal(false);

    isAssistant = computed(() => this.message().role === 'assistant');
    isUser = computed(() => this.message().role === 'user');
    isActiveStream = computed(() => this.isAssistant() && this.streamState() !== 'idle');
    canDelete = computed(() => !!this.message().id && !this.isActiveStream() && !this.actionsDisabled());
    canSendAgain = computed(() => !this.isActiveStream() && !this.actionsDisabled());
    canEdit = computed(() => this.isUser() && !this.actionsDisabled());
    steps = computed(() => this.message().steps ?? []);
    displaySteps = computed<ChatDisplayStep[]>(() => {
        return this.steps().reduce<ChatDisplayStep[]>((displaySteps, step) => {
            if (this.isStatusStep(step.icon) && displaySteps.length > 0) {
                const previousStep = displaySteps[displaySteps.length - 1];
                displaySteps[displaySteps.length - 1] = {
                    ...previousStep,
                    statusIcon: step.icon,
                };
                return displaySteps;
            }

            displaySteps.push({
                icon: step.icon,
                message: step.message,
            });
            return displaySteps;
        }, []);
    });
    hasSteps = computed(() => this.displaySteps().length > 0);
    isThinkingVisible = computed(() => {
        return this.isAssistant() && this.hasSteps();
    });
    hasActiveToolStep = computed(() => {
        const steps = this.displaySteps();
        const lastStep = steps[steps.length - 1];
        return !!lastStep && !lastStep.statusIcon;
    });
    showPreparingLoader = computed(() => {
        return (
            this.isAssistant() &&
            this.streamState() === 'streaming' &&
            !this.hasQueuedText() &&
            !this.displayedContent().trim() &&
            !this.hasActiveToolStep()
        );
    });
    isRenderingTemplate = computed(() => {
        const content = this.displayedContent();
        return /```component\b/i.test(content);
    });
    showCursor = computed(() => {
        return (
            this.isAssistant() && this.rowState() === 'typing' && this.hasQueuedText() && !this.isRenderingTemplate() && !this.isInsideComponentStream()
        );
    });
    contentForDisplay = computed(() => {
        return this.isActiveStream() ? this.displayedContent() : this.message().content;
    });
    roleLabel = computed(() => (this.isUser() ? '\u05d0\u05ea\u05d4' : '\u05e1\u05d5\u05db\u05df AI'));

    private syncContent = effect(() => {
        const message = this.message();
        const state = this.streamState();
        const content = message.content ?? '';
        const active = message.role === 'assistant' && state !== 'idle';
        const hasSteps = (message.steps?.length ?? 0) > 0;

        untracked(() => {
            if (!active) {
                this.resetLocalState(content);
                return;
            }

            if (state === 'errored' || content.length < this.lastCanonicalLength) {
                this.stopTyping();
                this.queuedText = '';
                this.hasQueuedText.set(false);
                this.lastCanonicalLength = content.length;
                this.displayedContent.set(content);
                this.rowState.set('complete');
                return;
            }

            const nextText = content.slice(this.lastCanonicalLength);
            this.lastCanonicalLength = content.length;

            if (!content && hasSteps && state === 'streaming') {
                this.rowState.set('thinking');
                return;
            }

            if (nextText.length > 0) {
                this.queuedText += nextText;
                this.hasQueuedText.set(true);
            }

            if (this.queuedText) {
                this.rowState.set('typing');
                this.scheduleTyping();
                return;
            }

            if (state === 'completed') {
                this.rowState.set('complete');
            } else {
                this.rowState.set('thinking');
            }
        });
    });

    ngOnDestroy(): void {
        this.stopTyping();
        this.clearCopiedTimer();
    }

    requestAction(action: ChatMessageAction): void {
        if (action === 'copy') {
            this.showCopiedState();
        }

        this.actionRequested.emit({
            action,
            message: this.message(),
        });
    }

    private resetLocalState(content: string): void {
        this.stopTyping();
        this.queuedText = '';
        this.hasQueuedText.set(false);
        this.lastCanonicalLength = content.length;
        this.currentWordDelay = this.nextCharacterDelay();
        this.displayedContent.set(content);
        this.rowState.set('idle');
    }

    private scheduleTyping(): void {
        if (this.typeTimer || !this.queuedText) return;

        const tick = () => {
            if (!this.queuedText) {
                this.typeTimer = undefined;
                this.hasQueuedText.set(false);
                if (this.streamState() === 'completed') {
                    this.rowState.set('complete');
                }
                return;
            }

            this.rowState.set('typing');

            const chunkSize = this.nextChunkSize();
            const chunk = this.queuedText.slice(0, chunkSize);
            this.queuedText = this.queuedText.slice(chunk.length);
            this.hasQueuedText.set(this.queuedText.length > 0);
            this.displayedContent.update((current) => current + chunk);

            this.typeTimer = setTimeout(tick, this.nextDelay(chunk));
        };

        this.typeTimer = setTimeout(tick, 0);
    }

    private stopTyping(): void {
        if (!this.typeTimer) return;
        clearTimeout(this.typeTimer);
        this.typeTimer = undefined;
    }

    private showCopiedState(): void {
        this.copied.set(true);
        this.clearCopiedTimer();
        this.copiedTimer = setTimeout(() => {
            this.copied.set(false);
            this.copiedTimer = undefined;
        }, 1200);
    }

    private clearCopiedTimer(): void {
        if (!this.copiedTimer) return;
        clearTimeout(this.copiedTimer);
        this.copiedTimer = undefined;
    }

    private nextChunkSize(): number {
        const queueLength = this.queuedText.length;

        if (this.streamState() === 'completed') {
            if (queueLength <= TINY_FLUSH_QUEUE_LENGTH) return 2;
            if (queueLength > 480) return 4;
            if (queueLength > 220) return 3;
            return 2;
        }

        if (this.isInsideComponentStream()) {
            if (queueLength > 360) return 24;
            if (queueLength > 160) return 18;
            return 12;
        }

        if (queueLength > 360) return 3;
        if (queueLength > 160) return 2;
        return 1;
    }

    private nextDelay(chunk: string): number {
        if (this.streamState() === 'completed') {
            return MIN_VISIBLE_TICK_MS;
        }

        if (this.isInsideComponentStream()) {
            return 0;
        }

        const lastChar = chunk[chunk.length - 1] ?? '';

        if (/\s/.test(lastChar)) {
            this.currentWordDelay = this.nextCharacterDelay();
            return 34;
        }

        if (this.isInsideCodeBlock()) {
            return this.currentWordDelay;
        }

        if (/[.!?:;]/.test(lastChar)) return 120;
        if (/[,]/.test(lastChar)) return 70;

        return this.currentWordDelay;
    }

    private nextCharacterDelay(): number {
        return BASE_CHARACTER_DELAY_MS + Math.floor(Math.random() * CHARACTER_DELAY_JITTER_MS);
    }

    private isInsideCodeBlock(): boolean {
        const fenceCount = (this.displayedContent().match(/```/g) ?? []).length;
        return fenceCount % 2 === 1;
    }

    private isInsideComponentStream(): boolean {
        const content = this.displayedContent();
        const openComponentFence = /```component\b/i.test(content);
        if (!openComponentFence) return false;

        const closedCount = (content.match(/```component[\s\S]*?```/gi) ?? []).length;
        const openCount = (content.match(/```component\b/gi) ?? []).length;
        return openCount > closedCount;
    }

    private isStatusStep(icon: string): boolean {
        return icon === 'ph-check-circle' || icon === 'ph-warning-circle';
    }
}
