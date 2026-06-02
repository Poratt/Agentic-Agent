import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../core/services/chat.service';
import { ChatStore } from '../../../core/store/chat.store';
import { IChatMessage } from '../../../core/models/chat-message.interface';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';
import { ChatMessage, ChatMessageStreamState } from '../chat-message/chat-message';

@Component({
	selector: 'app-chat',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, AutoScrollBottomDirective, ChatMessage],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {
	private chatService = inject(ChatService);
	protected chatStore = inject(ChatStore);
	private route = inject(ActivatedRoute);
	private fb = inject(FormBuilder);

	messages = signal<IChatMessage[]>([]);
	loading = signal<boolean>(false);
	historyLoading = signal<boolean>(false);
	activeAssistantIndex = signal<number | null>(null);
	activeStreamState = signal<ChatMessageStreamState>('idle');

	chatForm: FormGroup = this.fb.group({
		prompt: ['', [Validators.required, Validators.minLength(1)]],
	});

	private routeSub?: Subscription;

	ngOnInit() {
		this.routeSub = this.route.queryParams.subscribe((params) => {
			const sessionId = params['sessionId'] ? Number(params['sessionId']) : null;

			this.clearActiveStream();

			if (!sessionId) {
				this.chatStore.createSession();
				return;
			}

			this.chatStore.currentSessionId.set(sessionId);
			this.loadConversationHistory(sessionId);
		});
	}

	ngOnDestroy() {
		this.routeSub?.unsubscribe();
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
		const currentId = this.chatStore.currentSessionId();
		if (this.chatForm.invalid || this.loading() || !currentId) {
			return;
		}

		const promptValue = this.chatForm.value.prompt.trim();
		this.chatForm.reset();

		const userMsg: IChatMessage = {
			role: 'user',
			content: promptValue,
		};

		const assistantMsg: IChatMessage = {
			role: 'assistant',
			content: '',
			steps: [],
		};

		this.messages.update((prev) => [...prev, userMsg, assistantMsg]);
		this.loading.set(true);
		this.activeAssistantIndex.set(this.messages().length - 1);
		this.activeStreamState.set('streaming');

		const isFirstMessage = this.messages().length <= 2;

		this.chatService.sendMessageStream(promptValue, currentId).subscribe({
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

				const currentSession = this.chatStore.sessions().find((s) => s.id === currentId);

				if (isFirstMessage || currentSession?.title === 'שיחה חדשה...') {
					this.chatStore.loadSessions();
				}
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
}
