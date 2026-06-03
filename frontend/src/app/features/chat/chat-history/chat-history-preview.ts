import { Component, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';
import { RouterLink } from '@angular/router';
import { ChatStore } from '../../../core/store/chat.store';

@Component({
    selector: 'app-chat-history-preview',
    template: `
        <div class=" justify-center">
            <button [routerLink]="['/chat/history']" class="btn-show-all-sessions"
                (mouseenter)="menu.toggle($event)" >
                <span class="ph ph-hard-drives"></span>
                <span>היסטוריה</span>
            </button>
            <p-tieredmenu #menu [model]="items" [popup]="true" />
        </div>
    `,
    standalone: true,
    imports: [ButtonModule, RouterLink, TieredMenuModule]
})
export class ChatHistoryPreview implements OnInit {
    chatStore = inject(ChatStore);
    items: MenuItem[] | undefined;

    lastSessions = this.chatStore.sessions().slice(0, 5);
    
    ngOnInit() {
        this.items = [
            {
                label: 'File',
                icon: 'ph ph-chat-centered-text',
            },

        ];
    }
}