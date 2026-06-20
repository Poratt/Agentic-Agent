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

export interface LlmModelView extends LlmModel {
    testResults?: any[];
    hasTests: boolean;
    latencyAverage: number;
    successPercentage: number;
    performanceScore: number;
}

export interface LlmProviderView extends Omit<LlmProvider, 'models'> {
    models: LlmModelView[];
    modelsCount: number;
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
    styleUrl: './llm-providers-management.css'
})
export class LlmProvidersManagement implements OnInit {
    private table = viewChild<Table>('table');

    protected authStore = inject(AuthStore);
    protected llmProviderService = inject(LlmProviderService);
    protected llmProviderStore = inject(LlmProviderStore);
    protected readonly PageStates = PageStates;
    protected readonly globalFilterFields = ['id', 'key', 'label', 'baseUrl', 'createdAt'];

    testingModelId = signal<number>(0);

    // Keyed by provider.id — drives the outer p-table row expansion
    expandedProviders = signal<Record<number, boolean>>({});
    // Keyed by model.id — drives the inner p-table row expansion (shared across all provider sub-tables)
    expandedModels = signal<Record<number, boolean>>({});

    pageState = computed(() => this.llmProviderStore.pageState());

    llmProviders = computed<LlmProviderView[]>(() => {
        const providers = this.llmProviderStore.providers();

        return providers.map(provider => ({
            ...provider,
            modelsCount: (provider.models || []).length,
            models: (provider.models || []).map(model => {
                const results = model.testResults || [];
                const totalTests = results.length;

                if (totalTests === 0) {
                    return { ...model, hasTests: false, latencyAverage: 0, successPercentage: 0, performanceScore: -1 };
                }

                const successfulTests = results.filter(r => r.status === 'success').length;
                const successPercentage = Math.round((successfulTests / totalTests) * 100);

                const successfulResults = results.filter(r => r.status === 'success');
                let latencyAverage = 0;

                if (successfulResults.length > 0) {
                    const totalLatency = successfulResults.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0);
                    latencyAverage = Math.round(totalLatency / successfulResults.length);
                }

                const performanceScore = (successPercentage * 100000) - latencyAverage;

                return {
                    ...model,
                    hasTests: true,
                    latencyAverage,
                    successPercentage,
                    performanceScore
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
        if (confirm('Are you sure you want to delete this provider?')) {
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
                alert('Test failed: ' + (err?.error?.message || 'Unknown error'));
                this.llmProviderStore.loadProviders();
            }
        });
    }

    toggleProvider(providerId: number) {
        this.expandedProviders.update(state => ({ ...state, [providerId]: !state[providerId] }));
    }

    isProviderExpanded(providerId: number): boolean {
        return !!this.expandedProviders()[providerId];
    }

    toggleModel(modelId: number) {
        this.expandedModels.update(state => ({ ...state, [modelId]: !state[modelId] }));
    }

    isModelExpanded(modelId: number): boolean {
        return !!this.expandedModels()[modelId];
    }

    formatLatency(ms: number): string {
        if (!ms) return '0ms';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    performanceClass(percentage: number): string {
        if (percentage >= 90) return 'good';
        if (percentage >= 60) return 'mid';
        return 'bad';
    }
}