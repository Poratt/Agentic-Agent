import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../core/services/chat.service';
import { ChatStore } from '../../../core/store/chat.store';
import { AuthStore } from '../../../core/store/auth.store';
import { IChatMessage } from '../../../core/models/chat-message.interface';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';
import { ChatMessage, ChatMessageStreamState } from '../chat-message/chat-message';
import { UsersStore } from '../../../core/store/users.store';

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

	chatForm: FormGroup = this.fb.group({
		prompt: ['', [Validators.required, Validators.minLength(1)]],
	});

	private routeSub?: Subscription;

	ngOnInit() {
		this.userStore.loadCurrentUser();

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

		this.chatForm.reset();

		const currentId = this.chatStore.currentSessionId();
		if (currentId) {
			this.sendPromptToSession(promptValue, currentId);
			return;
		}

		this.chatStore.createSessionForMessage(false).subscribe({
			next: (session) => {
				this.sendPromptToSession(promptValue, session.id);
			},
			error: () => {
				this.loading.set(false);
			},
		});
	}

	private sendPromptToSession(promptValue: string, sessionId: number) {
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

		this.chatService.sendMessageStream(promptValue, sessionId).subscribe({
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
}
