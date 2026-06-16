import { Component, inject, OnInit, computed, viewChild, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AuthStore } from '../../core/store/auth.store';
import { LlmProviderStore } from '../../core/store/llm-provider.store';
import { PageStates } from '../../core/enums/page-states.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';
import { LlmProvider, LlmProviderService, LlmModel } from '../../core/services/llm-provider.service';

// 🚀 הרחבת הטיפוסים כדי שיכילו את הציונים המחושבים עבור התצוגה 🚀
export interface LlmModelView extends LlmModel {
    testResults?: any[];
    hasTests: boolean;
    latencyAverage: number;
    successPercentage: number;
}

export interface LlmProviderView extends Omit<LlmProvider, 'models'> {
    models: LlmModelView[];
}

@Component({
    selector: 'app-llm-providers-management',
    standalone: true,
    imports: [
        CommonModule,
        InputTextModule,
        TableModule,
        ButtonModule,
        RippleModule,
        BadgeColor
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './llm-providers-management.html',
    styles: [`
        .performance-cell {
            display: flex;
            align-items: center;
            gap: 8px;
        }
    `] // 🚀 תוספת קטנה לעיצוב השורה של הציונים
})
export class LlmProvidersManagement implements OnInit {
    private table = viewChild<Table>('table');

    protected authStore = inject(AuthStore);
    protected llmProviderService = inject(LlmProviderService);
    protected llmProviderStore = inject(LlmProviderStore);
    protected readonly PageStates = PageStates;
    protected readonly globalFilterFields = ['id', 'key', 'label', 'baseUrl', 'createdAt'];

    testingModelId = signal<number>(0);

    pageState = computed(() => this.llmProviderStore.pageState());

    llmProviders = computed<LlmProviderView[]>(() => {
        const providers = this.llmProviderStore.providers();

        return providers.map(provider => ({
            ...provider,
            models: (provider.models || []).map(model => {
                const results = model.testResults || [];
                const totalTests = results.length;

                if (totalTests === 0) {
                    return { ...model, hasTests: false, latencyAverage: 0, successPercentage: 0 };
                }

                const successfulTests = results.filter(r => r.status === 'success').length;
                const successPercentage = Math.round((successfulTests / totalTests) * 100);

                const successfulResults = results.filter(r => r.status === 'success');
                let latencyAverage = 0;

                if (successfulResults.length > 0) {
                    const totalLatency = successfulResults.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0);
                    latencyAverage = Math.round(totalLatency / successfulResults.length);
                }

                return {
                    ...model,
                    hasTests: true,
                    latencyAverage,
                    successPercentage
                };
            })
        }));
    });

    ngOnInit() {
        this.llmProviderStore.loadProviders();
    }

    applyGlobalFilter(event: Event) {
        this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    toggleProviderActive(providerId: number, currentStatus: boolean) {
        this.llmProviderStore.updateProvider(providerId, { active: !currentStatus });
    }

    deleteProvider(providerId: number) {
        if (confirm('האם אתה בטוח שברצונך למחוק ספק זה?')) {
            this.llmProviderStore.deleteProvider(providerId);
        }
    }

    testModel(modelId: number) {
        this.testingModelId.set(modelId);
        this.llmProviderService.testModel(modelId).subscribe({
            next: () => {
                this.testingModelId.set(0);
                this.llmProviderStore.loadProviders();
            },
            error: (err) => {
                this.testingModelId.set(0);
                alert('הבדיקה נכשלה: ' + (err?.error?.message || 'שגיאה לא ידועה'));
                this.llmProviderStore.loadProviders();
            }
        });
    }

    formatLatency(ms: number): string {
        if (!ms) return '0ms';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }
}