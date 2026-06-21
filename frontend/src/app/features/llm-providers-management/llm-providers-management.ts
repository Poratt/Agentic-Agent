import { Component, inject, OnInit, computed, viewChild, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
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

interface ProviderFormValue {
    key: string;
    label: string;
    baseUrl: string;
    apiKey: string;
    active: boolean;
}

interface ModelFormValue {
    key: string;
    label: string;
    active: boolean;
}

@Component({
    selector: 'app-llm-providers-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        TableModule,
        ButtonModule,
        RippleModule,
        DialogModule,
        ToggleSwitchModule,
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

    // Dialog visibility — bound via [(visible)] so must be signals
    providerDialogVisible = signal(false);
    modelDialogVisible = signal(false);

    // Dialog form values — plain mutable objects so [(ngModel)]="providerForm.key" works directly.
    // (A signal's properties aren't individually bindable with ngModel; only signal() itself can be
    // targeted by Angular's new [(model)] syntax, not dot-paths into it.)
    providerForm: ProviderFormValue = { key: '', label: '', baseUrl: '', apiKey: '', active: true };
    modelForm: ModelFormValue = { key: '', label: '', active: true };

    editingProviderId = signal<number | null>(null);
    editingModelProviderId = signal<number | null>(null);
    editingModelId = signal<number | null>(null);

    // Keyed by provider.id — drives the outer table row expansion
    expandedProviders = signal<Record<number, boolean>>({});
    // Keyed by model.id — drives the inner table row expansion (shared across all provider sub-tables)
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

    // Label of the provider currently targeted by the model dialog — used in the dialog header
    modelDialogProviderLabel = computed(() => {
        const providerId = this.editingModelProviderId();
        if (providerId === null) return '';
        return this.llmProviders().find(p => p.id === providerId)?.label ?? '';
    });

    // Header for the model dialog — "Edit Model | {provider}" or "New Model | {provider}"
    modelDialogTitle = computed(() => {
        const mode = this.editingModelId() !== null ? 'Edit' : 'New';
        return `${mode} Model | ${this.modelDialogProviderLabel()}`;
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

    // ── Provider dialog ──────────────────────────────────────────────

    openAddProviderDialog() {
        this.providerForm = { key: '', label: '', baseUrl: '', apiKey: '', active: true };
        this.editingProviderId.set(null);
        this.providerDialogVisible.set(true);
    }

    openEditProviderDialog(provider: LlmProviderView) {
        this.providerForm = {
            key: provider.key,
            label: provider.label,
            baseUrl: provider.baseUrl,
            apiKey: '',
            active: provider.active
        };
        this.editingProviderId.set(provider.id);
        this.providerDialogVisible.set(true);
    }

    closeProviderDialog() {
        this.providerDialogVisible.set(false);
        this.providerForm = { key: '', label: '', baseUrl: '', apiKey: '', active: true };
        this.editingProviderId.set(null);
    }

    saveProvider() {
        const id = this.editingProviderId();
        const payload: Partial<LlmProvider> = { ...this.providerForm };

        if (!payload.apiKey) {
            delete payload.apiKey;
        }

        if (id === null) {
            this.llmProviderStore.createProvider(payload);
        } else {
            this.llmProviderStore.updateProvider(id, payload);
        }

        this.closeProviderDialog();
    }

    // ── Model dialog ─────────────────────────────────────────────────

    openAddModelDialog(providerId: number) {
        this.modelForm = { key: '', label: '', active: true };
        this.editingModelProviderId.set(providerId);
        this.editingModelId.set(null);
        this.modelDialogVisible.set(true);
    }

    openEditModelDialog(providerId: number, model: LlmModel) {
        this.modelForm = { key: model.key, label: model.label, active: model.active };
        this.editingModelProviderId.set(providerId);
        this.editingModelId.set(model.id);
        this.modelDialogVisible.set(true);
    }

    closeModelDialog() {
        this.modelDialogVisible.set(false);
        this.modelForm = { key: '', label: '', active: true };
        this.editingModelProviderId.set(null);
        this.editingModelId.set(null);
    }

    saveModel() {
        const providerId = this.editingModelProviderId();
        if (providerId === null) return;

        const modelId = this.editingModelId();
        const payload: Partial<LlmModel> = { ...this.modelForm };

        if (modelId === null) {
            this.llmProviderStore.createModel(providerId, payload);
        } else {
            this.llmProviderStore.updateModel(providerId, modelId, payload);
        }

        this.closeModelDialog();
    }

    deleteModel(providerId: number, modelId: number) {
        if (confirm('Are you sure you want to deactivate this model?')) {
            this.llmProviderStore.deleteModel(providerId, modelId);
        }
    }

    deleteTestResult(providerId: number, modelId: number, testResultId: number) {
        if (confirm('Are you sure you want to delete this test result?')) {
            this.llmProviderStore.deleteTestResult(providerId, modelId, testResultId);
        }
    }
}

// Laguna M.1 - poolside/laguna-m.1:free
// gpt-oss-120b - openai/gpt-oss-120b:free
// gpt-oss-20b - openai/gpt-oss-20b:free
// Nemotron 3 Nano 30B A3B - nvidia/nemotron-3-nano-30b-a3b:free
// Nemotron 3 Nano Omni - nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
// Nemotron Nano 9B V2 - nvidia/nemotron-nano-9b-v2:free
// Nemotron Nano 12B 2 VL - nvidia/nemotron-nano-12b-v2-vl:free
// North Mini Code - cohere/north-mini-code:free
// Llama Nemotron Embed VL 1B V2 - nvidia/llama-nemotron-embed-vl-1b-v2:free
// Llama Nemotron Rerank VL 1B V2 - nvidia/llama-nemotron-rerank-vl-1b-v2:free
// LFM2.5-1.2B-Thinking - liquid/lfm-2.5-1.2b-thinking:free
// LFM2.5-1.2B-Instruct - liquid/lfm-2.5-1.2b-instruct:free
// Nemotron 3.5 Content Safety - nvidia/nemotron-3.5-content-safety:free
// Qwen3 Next 80B A3B Instruct - qwen/qwen3-next-80b-a3b-instruct:free
// Llama 3.3 70B Instruct - meta-llama/llama-3.3-70b-instruct:free
// Uncensored - cognitivecomputations/dolphin-mistral-24b-venice-edition:free
// Llama 3.2 3B Instruct - meta-llama/llama-3.2-3b-instruct:free
// Hermes 3 405B Instruct - nousresearch/hermes-3-llama-3.1-405b:free
// Qwen3 Coder 480B A35B - qwen/qwen3-coder:free