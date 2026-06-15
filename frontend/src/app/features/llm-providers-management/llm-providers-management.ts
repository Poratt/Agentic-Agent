import { Component, inject, OnInit, computed, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AuthStore } from '../../core/store/auth.store';
import { LlmProviderStore } from '../../core/store/llm-provider.store';
import { PageStates } from '../../core/enums/page-states.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';
import { LlmProvider } from '../../core/services/llm-provider.service';

@Component({
    selector: 'app-llm-providers-management',
    standalone: true,
    imports: [
        CommonModule,
        InputTextModule,
        TableModule,
        ButtonModule,
        RippleModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './llm-providers-management.html',
})
export class LlmProvidersManagement implements OnInit {
    private table = viewChild<Table>('table');

    protected authStore = inject(AuthStore);
    protected llmProviderStore = inject(LlmProviderStore);
    protected readonly PageStates = PageStates;
    protected readonly globalFilterFields = ['id', 'key', 'label', 'baseUrl', 'createdAt'];

    pageState = computed(() => {
        return this.llmProviderStore.pageState();
    });

    llmProviders = computed<LlmProvider[]>(() => {
        return this.llmProviderStore.providers()
    });

    ngOnInit() {
        this.llmProviderStore.loadProviders();
        setTimeout(() => {
            console.log(this.llmProviders());
        }, 2000);
    }

    applyGlobalFilter(event: Event) {
        this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    toggleProviderActive(providerId: number, currentStatus: boolean) {
        this.llmProviderStore.updateProvider(providerId, {
            active: !currentStatus
        });
    }

    deleteProvider(providerId: number) {
        if (confirm('האם אתה בטוח שברצונך למחוק ספק זה? כל המודלים המשויכים אליו יימחקו לצמיתות.')) {
            this.llmProviderStore.deleteProvider(providerId);
        }
    }
}