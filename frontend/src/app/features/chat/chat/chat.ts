import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    inject,
    signal,
    ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LlmModelGroup, LlmModelOption, LlmService, LlmStatus } from '../../../core/services/llm.service';
import { ChatStore } from '../../../core/store/chat.store';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatModelSelection, IChatMessage } from '../../../core/models/chat-message.interface';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';
import { ChatMessage, ChatMessageActionEvent, ChatMessageStreamState } from '../chat-message/chat-message';
import { UsersStore } from '../../../core/store/users.store';
import { Select } from 'primeng/select';
import { LlmProviderStore } from '../../../core/store/llm-provider.store';
import { ChatService } from '../../../core/services/chat.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, AutoScrollBottomDirective, ChatMessage, Select],
    templateUrl: './chat.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {
    @ViewChild('promptTextarea', { static: true })
    private promptTextarea?: ElementRef<HTMLTextAreaElement>;

    private chatService = inject(ChatService);
    private llmService = inject(LlmService);

    protected chatStore = inject(ChatStore);
    protected userStore = inject(UsersStore);
    protected authStore = inject(AuthStore);
    protected llmProviderStore = inject(LlmProviderStore);

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private fb = inject(FormBuilder);

    messages = signal<IChatMessage[]>([]);
    loading = signal<boolean>(false);
    historyLoading = signal<boolean>(false);
    actionError = signal<string | null>(null);
    deletingMessageId = signal<number | null>(null);
    activeAssistantIndex = signal<number | null>(null);
    activeStreamState = signal<ChatMessageStreamState>('idle');

    currentUserProfile = this.userStore.currentUserProfile;
    models = signal<LlmModelGroup[]>(this.llmProviderStore.groupedProviders());

    chatForm: FormGroup = this.fb.group({
        prompt: ['', [Validators.required, Validators.minLength(1)]],
        model: ['', []],
    });

    private routeSub?: Subscription;
    private activeStreamSub?: Subscription;

    ngOnInit() {
        this.promptTextarea?.nativeElement.focus();
        (window as any).agentPrompt = (prompt: string) => {
            this.chatForm.patchValue({ prompt });
            this.sendMessage();
        };
        this.userStore.loadCurrentUser();
        this.loadModelOptions();

        this.routeSub = this.route.queryParams.subscribe((params) => {
            const sessionId = params['sessionId'] ? Number(params['sessionId']) : null;

            this.cancelActiveStream();

            if (!sessionId) {
                this.chatStore.clearCurrentSession();
                this.messages.set([]);
                this.historyLoading.set(false);
                return;
            }

            this.chatStore.currentSessionId.set(sessionId);
            this.loadConversationHistory(sessionId);
        });
    }

    ngOnDestroy() {
        this.cancelActiveStream();

        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
    }

    private loadModelOptions(): void {
        this.llmService.getModelOptions().subscribe({
            next: (response) => {
                const modelGroups = this.toSelectableModelGroups(response.result ?? []);
                this.models.set(modelGroups);
                this.applyActiveModelSelection(modelGroups);
            },
            error: () => {
                this.models.set([]);
            },
        });
    }

    private loadConversationHistory(sessionId: number) {
        this.historyLoading.set(true);
        this.messages.set([]);

        this.chatService.getSessionMessages(sessionId).subscribe({
            next: (history) => {
                this.messages.set(history ?? []);
                this.historyLoading.set(false);
            },
            error: () => {
                this.historyLoading.set(false);
                this.messages.set([
                    {
                        role: 'assistant',
                        content: '[שגיאה בטעינת היסטוריית השיחה. נא לנסות שוב]',
                    },
                ]);
            },
        });
    }

    sendMessage() {
        if (this.chatForm.invalid || this.loading()) {
            return;
        }

        const promptValue = this.chatForm.value.prompt?.trim();
        if (!promptValue) {
            return;
        }

        const selectedModelId = this.chatForm.value.model;
        const modelSelection = this.getModelSelection(selectedModelId);
        this.chatForm.patchValue({ prompt: '' });

        const currentId = this.chatStore.currentSessionId();
        if (currentId) {
            this.sendPromptToSession(promptValue, currentId, modelSelection);
            return;
        }

        this.chatStore.createSessionForMessage(false).subscribe({
            next: (session) => {
                this.sendPromptToSession(promptValue, session.id, modelSelection);
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    private sendPromptToSession(promptValue: string, sessionId: number, modelSelection?: ChatModelSelection) {
        this.cancelActiveStream();
        this.actionError.set(null);

        const userMsg: IChatMessage = {
            role: 'user',
            content: promptValue,
        };

        const assistantMsg: IChatMessage = {
            role: 'assistant',
            content: '',
            steps: [],
        };

        this.messages.update((prev) => {
            return [...prev, userMsg, assistantMsg];
        });
        this.loading.set(true);
        const assistantIndex = this.messages().length - 1;
        this.activeAssistantIndex.set(assistantIndex);
        this.activeStreamState.set('streaming');

        const isFirstMessage = this.messages().length <= 2;

        this.activeStreamSub = this.chatService.sendMessageStream(promptValue, sessionId, modelSelection).subscribe({
            next: (event) => {
                if (event.type === 'step' && event.message && event.icon) {
                    this.messages.update((prev) => {
                        const updated = [...prev];
                        const current = updated[assistantIndex];
                        if (!current) return prev;

                        const currentSteps = current.steps || [];

                        updated[assistantIndex] = {
                            ...current,
                            steps: [...currentSteps, { icon: event.icon, message: event.message }],
                        };

                        return updated;
                    });
                    return;
                }

                if (event.type === 'token' && event.content) {
                    this.messages.update((prev) => {
                        const updated = [...prev];
                        const current = updated[assistantIndex];
                        if (!current) return prev;

                        updated[assistantIndex] = {
                            ...current,
                            content: current.content + event.content!,
                        };

                        return updated;
                    });
                }
            },
            error: () => {
                this.activeStreamSub = undefined;
                this.loading.set(false);
                this.activeStreamState.set('errored');
                this.messages.update((prev) => {
                    const updated = [...prev];
                    const current = updated[assistantIndex];
                    if (!current) return prev;

                    updated[assistantIndex] = {
                        ...current,
                        content: '[שגיאה בקבלת תגובה מהשרת. נא לנסות שוב]',
                    };

                    return updated;
                });
            },
            complete: () => {
                this.activeStreamSub = undefined;
                this.loading.set(false);
                this.activeStreamState.set('completed');

                const currentSession = this.chatStore.sessions().find((s) => {
                    return s.id === sessionId;
                });

                if (isFirstMessage || currentSession?.title === 'שיחה חדשה...') {
                    this.chatStore.loadSessions();
                }

                this.router.navigate(['/chat'], { queryParams: { sessionId }, replaceUrl: true });
            },
        });
    }

    stopStreaming(): void {
        if (!this.activeStreamSub) {
            this.clearActiveStream();
            return;
        }

        this.activeStreamSub.unsubscribe();
        this.activeStreamSub = undefined;
        this.loading.set(false);
        this.activeStreamState.set('completed');

        const assistantIndex = this.activeAssistantIndex();
        if (assistantIndex === null) {
            return;
        }

        this.messages.update((prev) => {
            const current = prev[assistantIndex];
            if (!current || current.content.trim()) return prev;

            const updated = [...prev];
            updated[assistantIndex] = {
                ...current,
                content: '\u05d4\u05ea\u05d2\u05d5\u05d1\u05d4 \u05d1\u05d5\u05d8\u05dc\u05d4.',
            };
            return updated;
        });
    }

    onPromptKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();
        this.sendMessage();
    }

    getStreamState(index: number, message: IChatMessage): ChatMessageStreamState {
        if (message.role !== 'assistant' || this.activeAssistantIndex() !== index) {
            return 'idle';
        }

        return this.activeStreamState();
    }

    handleMessageAction(event: ChatMessageActionEvent): void {
        this.actionError.set(null);

        if (event.action === 'delete') {
            this.deleteMessageFromSession(event.message);
            return;
        }

        if (event.action === 'sendAgain') {
            this.sendAgain(event.message);
            return;
        }

        if (event.action === 'copy') {
            this.copyMessage(event.message);
            return;
        }

        if (event.action === 'edit') {
            this.editMessage(event.message);
        }
    }

    private cancelActiveStream(): void {
        if (this.activeStreamSub) {
            this.activeStreamSub.unsubscribe();
            this.activeStreamSub = undefined;
        }

        this.clearActiveStream();
    }

    private clearActiveStream(): void {
        this.loading.set(false);
        this.activeAssistantIndex.set(null);
        this.activeStreamState.set('idle');
    }

    private deleteMessageFromSession(message: IChatMessage): void {
        const sessionId = message.sessionId ?? this.chatStore.currentSessionId();

        if (!sessionId || !message.id) {
            this.actionError.set('\u05d0\u05d9 \u05d0\u05e4\u05e9\u05e8 \u05dc\u05de\u05d7\u05d5\u05e7 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05e9\u05e2\u05d3\u05d9\u05d9\u05df \u05dc\u05d0 \u05e0\u05e9\u05de\u05e8\u05d4.');
            return;
        }

        this.deletingMessageId.set(message.id);
        this.chatService.deleteMessage(sessionId, message.id).subscribe({
            next: () => {
                this.messages.update((prev) => {
                    const deleteFromIndex = prev.findIndex((item) => {
                        return item.id === message.id;
                    });

                    if (deleteFromIndex < 0) return prev;

                    return prev.slice(0, deleteFromIndex);
                });
                this.deletingMessageId.set(null);
                this.chatStore.loadSessions();
            },
            error: () => {
                this.deletingMessageId.set(null);
                this.actionError.set('\u05de\u05d7\u05d9\u05e7\u05ea \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4. \u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1.');
            },
        });
    }

    private copyMessage(message: IChatMessage): void {
        if (!navigator.clipboard) {
            this.actionError.set('\u05d4\u05d3\u05e4\u05d3\u05e4\u05df \u05dc\u05d0 \u05de\u05d0\u05e4\u05e9\u05e8 \u05d4\u05e2\u05ea\u05e7\u05d4 \u05db\u05e8\u05d2\u05e2.');
            return;
        }

        void navigator.clipboard.writeText(message.content).catch(() => {
            this.actionError.set('\u05d4\u05e2\u05ea\u05e7\u05ea \u05d4\u05d4\u05d5\u05d3\u05e2\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4.');
        });
    }

    private sendAgain(message: IChatMessage): void {
        if (this.loading()) {
            return;
        }

        const prompt = message.role === 'user' ? message.content : this.findPreviousUserPrompt(message);

        if (!prompt.trim()) {
            this.actionError.set('\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d4 \u05d4\u05d5\u05d3\u05e2\u05ea \u05de\u05e9\u05ea\u05de\u05e9 \u05e7\u05d5\u05d3\u05de\u05ea.');
            return;
        }

        this.chatForm.patchValue({ prompt });
        this.sendMessage();
    }

    private editMessage(message: IChatMessage): void {
        if (message.role !== 'user') return;

        this.chatForm.patchValue({ prompt: message.content });
        this.promptTextarea?.nativeElement.focus();
    }

    private findPreviousUserPrompt(message: IChatMessage): string {
        const messageIndex = this.messages().findIndex((item) => {
            if (message.id && item.id) {
                return item.id === message.id;
            }

            return item === message;
        });

        if (messageIndex < 0) return '';

        const previousUserMessage = this.messages()
            .slice(0, messageIndex)
            .reverse()
            .find((item) => {
                return item.role === 'user';
            });

        return previousUserMessage?.content ?? '';
    }

    private toSelectableModelGroups(groups: LlmModelGroup[]): LlmModelGroup[] {
        return groups.map((group) => {
            return {
                ...group,
                items: group.items.map((item) => {
                    return {
                        ...item,
                        id: item.id ?? this.getModelOptionId(group.label, item.value),
                        provider: item.provider ?? group.label,
                    };
                }),
            };
        });
    }

    private applyActiveModelSelection(groups: LlmModelGroup[]): void {
        this.llmService.getStatus().subscribe({
            next: (response) => {
                this.setSelectedModel(groups, response.result);
            },
            error: () => {
                this.setSelectedModel(groups);
            },
        });
    }

    private setSelectedModel(groups: LlmModelGroup[], status?: LlmStatus): void {
        const allOptions = groups.flatMap((group) => {
            return group.items;
        });
        const activeOption = status
            ? allOptions.find((option) => {
                return option.provider === status.activeProvider && option.value === status.activeModel;
            })
            : null;
        const fallbackOption = allOptions[0];
        const selectedOption = activeOption ?? fallbackOption;

        if (!selectedOption?.id) {
            return;
        }

        this.chatForm.patchValue({ model: selectedOption.id });
    }

    private getModelSelection(selectedModelId?: string): ChatModelSelection | undefined {
        if (!selectedModelId) {
            return undefined;
        }

        const selectedOption = this.models()
            .flatMap((group) => {
                return group.items;
            })
            .find((option) => {
                return option.id === selectedModelId;
            });

        if (!selectedOption?.provider) {
            return undefined;
        }

        return {
            provider: selectedOption.provider,
            model: selectedOption.value,
        };
    }

    private getModelOptionId(provider: LlmModelGroup['label'], model: LlmModelOption['value']): string {
        return `${provider}::${model}`;
    }
}
