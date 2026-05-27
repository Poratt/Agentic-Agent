import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../core/services/chat.service';
import { ChatStore } from '../../../core/store/chat.store';
import { IChatMessage } from '../../../core/models/chat-message.interface';
import { AiFormat } from '../../../core/directives/ai-format.directive';
import { AutoScrollBottomDirective } from '../../../core/directives/auto-scroll-bottom.directive';

@Component({
	selector: 'app-chat',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, AiFormat, AutoScrollBottomDirective],
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

	chatForm: FormGroup = this.fb.group({
		prompt: ['', [Validators.required, Validators.minLength(1)]],
	});

	private routeSub?: Subscription;

	ngOnInit() {
		this.routeSub = this.route.queryParams.subscribe((params) => {
			const sessionId = params['sessionId'] ? Number(params['sessionId']) : null;

			if (!sessionId) {
				// מנגנון אתחול אוטומטי - יוצר שיחה חדשה ומנווט אליה בצורה חלקה
				this.chatStore.createSession();
			} else {
				this.chatStore.currentSessionId.set(sessionId);
				this.loadConversationHistory(sessionId);
			}
		});
	}

	ngOnDestroy() {
		if (this.routeSub) {
			this.routeSub.unsubscribe();
		}
	}

	private loadConversationHistory(sessionId: number) {
		this.historyLoading.set(true);
		this.messages.set([]); // ניקוי מיידי של המסך למניעת קפיצות של שיחה קודמת

		this.chatService.getSessionMessages(sessionId).subscribe({
			next: (history) => {
				this.messages.set(history ?? []);
				this.historyLoading.set(false);
			},
			error: (err) => {
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

		// 1. שמירת הודעת משתמש מקומית
		const userMsg: IChatMessage = {
			role: 'user',
			content: promptValue,
		};

		this.messages.update((prev) => {
			return [...prev, userMsg];
		});

		// 2. הכנת הודעת עוזר ריקה לצורך הזרמה
		const assistantMsg: IChatMessage = {
			role: 'assistant',
			content: '',
		};

		this.messages.update((prev) => {
			return [...prev, assistantMsg];
		});

		this.loading.set(true);

		this.chatService.sendMessageStream(promptValue, currentId).subscribe({
			next: (chunk) => {
				this.messages.update((prev) => {
					const updated = [...prev];
					const lastIndex = updated.length - 1;
					updated[lastIndex] = {
						...updated[lastIndex],
						content: updated[lastIndex].content + chunk,
					};
					return updated;
				});
			},
			error: (err) => {
				this.loading.set(false);
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
				
				// ריענון וסנכרון ה-Sidebar בזמן אמת במידה ושם השיחה הוא עדיין "שיחה חדשה..."
				const currentSession = this.chatStore.sessions().find((s) => {
					return s.id === currentId;
				});

				if (currentSession && currentSession.title === 'שיחה חדשה...') {
					this.chatStore.loadSessions();
				}
			},
		});
	}
}