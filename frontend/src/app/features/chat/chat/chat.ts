import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatStore } from '../../../core/store/chat.store';
import { AuthStore } from '../../../core/store/auth.store';
import { ChatModelSelection, IChatMessage } from '../../../core/models/chat-message.interface';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';
import { ChatMessage, ChatMessageActionEvent, ChatMessageStreamState } from '../chat-message/chat-message';
import { UsersStore } from '../../../core/store/users.store';
import { Select } from 'primeng/select';
import { LlmProviderStore } from '../../../core/store/llm-provider.store';
import { ChatService } from '../../../core/services/chat.service';
import { LlmProviderService } from '../../../core/services/llm-provider.service';

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

    @ViewChild('fileInput')
    private fileInput?: ElementRef<HTMLInputElement>;

    private chatService = inject(ChatService);

    protected chatStore = inject(ChatStore);
    protected userStore = inject(UsersStore);
    protected authStore = inject(AuthStore);
    protected llmProviderStore = inject(LlmProviderStore);

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private fb = inject(FormBuilder);
    private llmProviderService = inject(LlmProviderService);

    constructor() {
        effect(() => {
            const groups = this.models();
            const currentSelection = this.chatForm.get('model')?.value;

            if (groups.length > 0 && !currentSelection) {
                let modelToSelect = null;

                for (const group of groups) {
                    const defaultModel = group.items?.find(m => m.isDefault);
                    if (defaultModel) {
                        modelToSelect = defaultModel;
                        break;
                    }
                }

                if (!modelToSelect) {
                    modelToSelect = groups[0]?.items?.[0];
                }

                if (modelToSelect) {
                    this.chatForm.patchValue({ model: modelToSelect.id });
                }
            }
        });
    }


    messages = signal<IChatMessage[]>([]);
    loading = signal<boolean>(false);
    historyLoading = signal<boolean>(false);
    actionError = signal<string | null>(null);
    deletingMessageId = signal<number | null>(null);
    activeAssistantIndex = signal<number | null>(null);
    activeStreamState = signal<ChatMessageStreamState>('idle');
    isDragging = signal<boolean>(false);
    selectedImageBase64 = signal<string | null>(null);
    selectedImagePreview = signal<string | null>(null);

    pendingConfirmation = signal<{ action: string; target: string; sessionId: number } | null>(null);

    currentUserProfile = this.userStore.currentUserProfile;

    // 🚀 כאן אנחנו פשוט שואבים את הנתונים המוכנים מה-Store 🚀
    models = this.llmProviderStore.groupedProviders;

    promptText = signal('');

    canSend = computed(() => {
        const hasText = !!this.promptText().trim();
        const hasImage = !!this.selectedImageBase64();
        return (hasText || hasImage) && !this.loading() && !this.historyLoading();
    });

    chatForm: FormGroup = this.fb.group({
        prompt: ['', []],
        model: ['', []],
    });

    private routeSub?: Subscription;
    private activeStreamSub?: Subscription;
    private tokenFlushHandle: number | null = null;
    private pendingTokenBuffer: string[] = [];
    private pendingAssistantIndex: number | null = null;

    ngOnInit() {
        this.promptTextarea?.nativeElement.focus();
        (window as any).agentPrompt = (prompt: string) => {
            this.chatForm.patchValue({ prompt });
            this.sendMessage();
        };

        this.chatForm.get('prompt')?.valueChanges.subscribe((value) => {
            this.promptText.set(value ?? '');
        });

        this.llmProviderStore.reload();

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

    openFilePicker(): void {
        this.fileInput?.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file && file.type.startsWith('image/')) {
            this.processFile(file);
        }

        input.value = '';
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragging.set(true);
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    onDragLeave(event: DragEvent): void {
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragging.set(false);

        const file = event.dataTransfer?.files[0];
        if (file && file.type.startsWith('image/')) {
            this.processFile(file);
        }
    }

    processFile(file: File): void {
        if (file.size > 8 * 1024 * 1024) {
            this.actionError.set('התמונה גדולה מדי (מקסימום 8MB).');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            this.selectedImageBase64.set(result);
            this.selectedImagePreview.set(result);
        };
        reader.readAsDataURL(file);
    }

    clearSelectedImage(): void {
        this.selectedImageBase64.set(null);
        this.selectedImagePreview.set(null);
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    hasMoreImages = signal<boolean>(false);

    private loadConversationHistory(sessionId: number) {
        this.historyLoading.set(true);
        this.messages.set([]);

        this.chatService.getSessionMessages(sessionId).subscribe({
            next: (result) => {
                this.messages.set(result.messages ?? []);
                this.hasMoreImages.set(result.hasMoreImages);
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

    loadMoreImages(): void {
        const strippedIds = this.messages()
            .filter((m) => m.id && m.imageUrl === undefined)
            .map((m) => m.id!);

        if (strippedIds.length === 0) return;

        this.chatService.getMessageImages(strippedIds).subscribe({
            next: (imageMap) => {
                this.messages.update((msgs) =>
                    msgs.map((m) => (m.id && imageMap[m.id] !== undefined ? { ...m, imageUrl: imageMap[m.id] ?? undefined } : m)),
                );
                this.hasMoreImages.set(false);
            },
        });
    }

    sendMessage() {
        if (this.loading()) {
            return;
        }

        const promptValue = this.chatForm.value.prompt?.trim() ?? '';
        const imageValue = this.selectedImageBase64();

        if (!promptValue && !imageValue) {
            return;
        }

        // PrimeNG שומר את ה-ID המספרי בזכות ה- optionValue="id"
        const selectedModelId = Number(this.chatForm.value.model);
        const modelSelection = this.getModelSelection(selectedModelId);
        this.chatForm.patchValue({ prompt: '' });

        const capturedPreview = this.selectedImagePreview();
        const capturedImage = imageValue ?? undefined;
        this.clearSelectedImage();

        const currentId = this.chatStore.currentSessionId();
        if (currentId) {
            this.sendPromptToSession(promptValue, currentId, modelSelection, capturedImage, capturedPreview ?? undefined);
            return;
        }

        this.chatStore.createSessionForMessage(false).subscribe({
            next: (session) => {
                this.sendPromptToSession(promptValue, session.id, modelSelection, capturedImage, capturedPreview ?? undefined);
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    private sendPromptToSession(promptValue: string, sessionId: number, modelSelection?: ChatModelSelection, image?: string, imagePreview?: string) {
        this.cancelActiveStream();
        this.actionError.set(null);

        const userMsg: IChatMessage = {
            role: 'user',
            content: promptValue,
            imagePreview: imagePreview || image || undefined,
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
        const streamStartTime = Date.now();

        this.activeStreamSub = this.chatService.sendMessageStream(promptValue, sessionId, modelSelection, image).subscribe({
            next: (event) => {
                if (event.type === 'confirmation' && event.action && event.target) {
                    this.pendingConfirmation.set({
                        action: event.action,
                        target: event.target,
                        sessionId,
                    });
                    return;
                }

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
                    this.pendingTokenBuffer.push(event.content);
                    this.pendingAssistantIndex = assistantIndex;
                    this.scheduleTokenFlush();
                }
            },
            error: () => {
                this.activeStreamSub = undefined;
                this.flushPendingTokens();
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
                this.flushPendingTokens();
                this.loading.set(false);
                this.activeStreamState.set('completed');

                const responseTimeMs = Date.now() - streamStartTime;
                this.messages.update((prev) => {
                    const updated = [...prev];
                    const current = updated[assistantIndex];
                    if (!current) return prev;
                    updated[assistantIndex] = { ...current, responseTimeMs };
                    return updated;
                });

                const currentSession = this.chatStore.sessions().find((s) => {
                    return s.id === sessionId;
                });

                if (isFirstMessage || currentSession?.title === 'שיחה חדשה...') {
                    this.chatStore.reload();
                }

                this.router.navigate(['/chat'], { queryParams: { sessionId }, replaceUrl: true });
            },
        });
    }

    onPromptInput(event: Event): void {
        const value = (event.target as HTMLTextAreaElement).value;
        this.promptText.set(value);
        this.autoGrow();
    }

    autoGrow(): void {
        const el = this.promptTextarea?.nativeElement;
        if (!el) return;
        el.style.height = 'auto';
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 25.6;
        el.style.height = `${Math.min(el.scrollHeight, lineHeight * 5)}px`;
    }

    onPromptKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();
        this.sendMessage();
    }

    onPaste(event: ClipboardEvent): void {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                const blob = item.getAsFile();
                if (blob) {
                    this.processFile(blob);
                }
                return;
            }
        }
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

        this.flushPendingTokens();
        this.clearActiveStream();
    }

    private clearActiveStream(): void {
        this.loading.set(false);
        this.activeAssistantIndex.set(null);
        this.activeStreamState.set('idle');
    }

    private scheduleTokenFlush(): void {
        if (this.tokenFlushHandle !== null) return;

        if (typeof requestAnimationFrame !== 'undefined') {
            this.tokenFlushHandle = requestAnimationFrame(() => {
                this.flushPendingTokens();
            });
        } else {
            setTimeout(() => this.flushPendingTokens(), 0);
        }
    }

    private flushPendingTokens(): void {
        if (this.tokenFlushHandle !== null) {
            if (typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(this.tokenFlushHandle);
            }
            this.tokenFlushHandle = null;
        }

        const tokens = this.pendingTokenBuffer;
        const assistantIndex = this.pendingAssistantIndex;
        this.pendingTokenBuffer = [];
        this.pendingAssistantIndex = null;

        if (tokens.length === 0 || assistantIndex === null) return;

        const joined = tokens.join('');
        this.messages.update((prev) => {
            const updated = [...prev];
            const current = updated[assistantIndex];
            if (!current) return prev;

            updated[assistantIndex] = {
                ...current,
                content: current.content + joined,
            };

            return updated;
        });
    }

    confirmPendingAction(confirmed: boolean): void {
        const pending = this.pendingConfirmation();
        if (!pending) return;

        this.pendingConfirmation.set(null);
        this.chatForm.patchValue({ prompt: confirmed ? 'yes' : 'no' });
        this.sendMessage();
    }

    setDefaultModel(event: Event, model: any): void {
        if (model.isDefault) return;

        this.llmProviderService.setDefaultModel(model.id).subscribe({
            next: () => {
                this.chatForm.patchValue({ model: model.id });
                this.llmProviderStore.reload();

                setTimeout(() => {
                    const target = event.target as HTMLElement;
                    const selectHost = target?.closest('p-select');
                    const trigger = selectHost?.querySelector('.p-select-trigger') as HTMLElement | null;
                    trigger?.blur();
                });
            },
            error: (err) => {
                console.error('Failed to set default model', err);
            }
        });
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

    private getModelSelection(selectedModelId?: number): ChatModelSelection | undefined {
        if (!selectedModelId) {
            return undefined;
        }

        for (const provider of this.llmProviderStore.providers()) {
            const model = provider.models?.find(m => m.id === selectedModelId);

            if (model) {
                return {
                    provider: provider.key,
                    model: model.key
                };
            }
        }

        return undefined;
    }


    stopStreaming(): void {
        if (!this.activeStreamSub) {
            this.flushPendingTokens();
            this.clearActiveStream();
            return;
        }

        this.activeStreamSub.unsubscribe();
        this.activeStreamSub = undefined;
        this.flushPendingTokens();
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
                content: 'התגובה בוטלה.',
            };
            return updated;
        });
    }

    private deleteMessageFromSession(message: IChatMessage): void {
        const sessionId = message.sessionId ?? this.chatStore.currentSessionId();

        if (!sessionId || !message.id) {
            this.actionError.set('אי אפשר למחוק הודעה שעדיין לא נשמרה.');
            return;
        }

        this.deletingMessageId.set(message.id);
        this.chatService.deleteMessage(sessionId, message.id).subscribe({
            next: () => {
                this.messages.update((prev) => {
                    const deleteFromIndex = prev.findIndex((item) => item.id === message.id);
                    if (deleteFromIndex < 0) return prev;
                    return prev.slice(0, deleteFromIndex);
                });
                this.deletingMessageId.set(null);
                this.chatStore.reload();
            },
            error: () => {
                this.deletingMessageId.set(null);
                this.actionError.set('מחיקת ההודעה נכשלה. נסה שוב.');
            },
        });
    }

    private copyMessage(message: IChatMessage): void {
        if (!navigator.clipboard) {
            this.actionError.set('הדפדפן לא מאפשר העתקה כרגע.');
            return;
        }

        void navigator.clipboard.writeText(message.content).catch(() => {
            this.actionError.set('העתקת ההודעה נכשלה.');
        });
    }

    private sendAgain(message: IChatMessage): void {
        if (this.loading()) {
            return;
        }

        const prompt = message.role === 'user' ? message.content : this.findPreviousUserPrompt(message);

        if (!prompt.trim()) {
            this.actionError.set('לא נמצאה הודעת משתמש קודמת.');
            return;
        }

        this.chatForm.patchValue({ prompt });
        this.sendMessage();
    }
}