import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatModelSelection, ChatService } from '../../../core/services/chat.service';
import { LlmModelGroup, LlmModelOption, LlmService, LlmStatus } from '../../../core/services/llm.service';
import { ChatStore } from '../../../core/store/chat.store';
import { AuthStore } from '../../../core/store/auth.store';
import { IChatMessage } from '../../../core/models/chat-message.interface';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';
import { ChatMessage, ChatMessageStreamState } from '../chat-message/chat-message';
import { UsersStore } from '../../../core/store/users.store';
import { Select } from 'primeng/select';

@Component({
	selector: 'app-chat',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, AutoScrollBottomDirective, ChatMessage, Select],
	templateUrl: './chat.html',
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
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private fb = inject(FormBuilder);

	messages = signal<IChatMessage[]>([]);
	loading = signal<boolean>(false);
	historyLoading = signal<boolean>(false);
	activeAssistantIndex = signal<number | null>(null);
	activeStreamState = signal<ChatMessageStreamState>('idle');

	currentUserProfile = this.userStore.currentUserProfile;
	models = signal<LlmModelGroup[]>([]);

	chatForm: FormGroup = this.fb.group({
		prompt: ['', [Validators.required, Validators.minLength(1)]],
		model: ['', []]
	});

	private routeSub?: Subscription;

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

			this.clearActiveStream();

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

	private sendPromptToSession(
		promptValue: string,
		sessionId: number,
		modelSelection?: ChatModelSelection,
	) {
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
		this.activeAssistantIndex.set(this.messages().length - 1);
		this.activeStreamState.set('streaming');

		const isFirstMessage = this.messages().length <= 2;

		this.chatService.sendMessageStream(promptValue, sessionId, modelSelection).subscribe({
			next: (event) => {
				if (event.type === 'step' && event.message && event.icon) {
					this.messages.update((prev) => {
						const updated = [...prev];
						const lastIndex = updated.length - 1;
						const currentSteps = updated[lastIndex].steps || [];

						updated[lastIndex] = {
							...updated[lastIndex],
							steps: [...currentSteps, { icon: event.icon, message: event.message }],
						};

						return updated;
					});
					return;
				}

				if (event.type === 'token' && event.content) {
					this.messages.update((prev) => {
						const updated = [...prev];
						const lastIndex = updated.length - 1;

						updated[lastIndex] = {
							...updated[lastIndex],
							content: updated[lastIndex].content + event.content!,
						};

						return updated;
					});
				}
			},
			error: () => {
				this.loading.set(false);
				this.activeStreamState.set('errored');
				this.messages.update((prev) => {
					const updated = [...prev];
					const lastIndex = updated.length - 1;

					updated[lastIndex] = {
						...updated[lastIndex],
						content: '[שגיאה בקבלת תגובה מהשרת. נא לנסות שוב]',
					};

					return updated;
				});
			},
			complete: () => {
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

	private clearActiveStream(): void {
		this.loading.set(false);
		this.activeAssistantIndex.set(null);
		this.activeStreamState.set('idle');
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
