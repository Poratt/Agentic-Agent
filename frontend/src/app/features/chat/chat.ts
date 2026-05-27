import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { IChatMessage } from '../../core/models/chat-message.interface';
import { AiFormat } from '../../core/directives/ai-format.directive';
import { AutoScrollBottomDirective } from '../../core/directives/auto-scroll-bottom.directive';

@Component({
	selector: 'app-chat',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, AiFormat, AutoScrollBottomDirective],
	templateUrl: './chat.html',
	styleUrl: './chat.css',
})
export class Chat {
	private chatService = inject(ChatService);
	private fb = inject(FormBuilder);

	messages = signal<IChatMessage[]>([]);
	loading = signal<boolean>(false);

	chatForm: FormGroup = this.fb.group({
		prompt: ['', [Validators.required, Validators.minLength(1)]],
	});

	sendMessage() {
		if (this.chatForm.invalid || this.loading()) {
			return;
		}

		const promptValue = this.chatForm.value.prompt.trim();
		this.chatForm.reset();

		const userMsg: IChatMessage = {
			role: 'user',
			content: promptValue,
		};

		this.messages.update((prev) => {
			return [...prev, userMsg];
		});

		const assistantMsg: IChatMessage = {
			role: 'assistant',
			content: '',
		};

		this.messages.update((prev) => {
			return [...prev, assistantMsg];
		});

		this.loading.set(true);

		this.chatService.sendMessageStream(promptValue).subscribe({
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
			},
		});
	}
}