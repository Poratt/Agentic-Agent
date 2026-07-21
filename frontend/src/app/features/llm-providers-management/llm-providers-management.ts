import { Component, inject, computed, viewChild, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthStore } from '../../core/store/auth.store';
import { LlmProviderStore } from '../../core/store/llm-provider.store';
import { PageStates } from '../../core/enums/page-states.enum';
import { BadgeColor } from '../../core/directives/badge-color.directive';
import { TooltipDirective } from '../../core/directives/tooltip.directive';

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
        ReactiveFormsModule,
        InputTextModule,
        TableModule,
        ButtonModule,
        RippleModule,
        DialogModule,
        ToggleSwitchModule,
        TooltipDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './llm-providers-management.html',
    styleUrl: './llm-providers-management.css'
})
export class LlmProvidersManagement implements OnInit {
    private table = viewChild<Table>('table');
    private fb = inject(FormBuilder);

    protected authStore = inject(AuthStore);
    protected llmProviderService = inject(LlmProviderService);
    protected llmProviderStore = inject(LlmProviderStore);
    protected confirmService = inject(ConfirmationService);
    protected messageService = inject(MessageService);
    protected readonly PageStates = PageStates;
    protected readonly globalFilterFields = ['id', 'key', 'label', 'baseUrl', 'createdAt'];

    ngOnInit(): void {
        this.llmProviderStore.loadUserDefaultModel();
    }

    testingModelId = signal<number>(0);

    // Dialog visibility — bound via [(visible)] so must be signals
    providerDialogVisible = signal(false);
    modelDialogVisible = signal(false);

    // Reactive Forms for Provider dialog
    providerForm: FormGroup = this.fb.group({
        key: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
        label: ['', [Validators.required]],
        baseUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.*/)]],
        apiKey: [''],
        active: [true]
    });

    // Reactive Forms for Model dialog
    modelForm: FormGroup = this.fb.group({
        key: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
        label: ['', [Validators.required]],
        active: [true]
    });

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

    // modelDialogTitle defined later

    // Provider dialog title computed property (replaces hardcoded header="Provider")
    providerDialogTitle = computed(() => {
        const mode = this.editingProviderId() !== null ? 'Edit' : 'New';
        const label = this.editingProviderId() !== null ? this.llmProviders().find(p => p.id === this.editingProviderId())?.label ?? '' : '';
        return `${mode} Provider${label ? ' | ' + label : ''}`;
    });

    // Existing modelDialogTitle remains unchanged
    modelDialogTitle = computed(() => {
        const mode = this.editingModelId() !== null ? 'Edit' : 'New';
        return `${mode} Model | ${this.modelDialogProviderLabel()}`;
    });

    applyGlobalFilter(event: Event) {
        this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    toggleProviderActive(providerId: number, currentStatus: boolean) {
        this.llmProviderStore.updateProvider(providerId, { active: !currentStatus });
    }

    deleteProvider(providerId: number) {
        this.confirmService.confirm({
            message: 'Are you sure you want to delete this provider?',
            header: 'Delete Provider',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.llmProviderStore.deleteProvider(providerId);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: 'Provider has been deleted successfully.'
                });
            }
        });
    }

    testModel(modelId: number) {
        this.testingModelId.set(modelId);
        this.llmProviderService.testModel(modelId).subscribe({
            next: () => {
                this.testingModelId.set(0);
                this.llmProviderStore.reload();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Test Complete',
                    detail: 'Model test completed successfully.'
                });
            },
            error: (err) => {
                this.testingModelId.set(0);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Test Failed',
                    detail: err?.error?.message || 'Unknown error'
                });
                this.llmProviderStore.reload();
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
        this.providerForm.reset({ key: '', label: '', baseUrl: '', apiKey: '', active: true });
        this.editingProviderId.set(null);
        this.providerDialogVisible.set(true);
    }

    openEditProviderDialog(provider: LlmProviderView) {
        this.providerForm.patchValue({
            key: provider.key,
            label: provider.label,
            baseUrl: provider.baseUrl,
            apiKey: '',
            active: provider.active
        });
        this.editingProviderId.set(provider.id);
        this.providerDialogVisible.set(true);
    }

    closeProviderDialog() {
        this.providerDialogVisible.set(false);
        this.providerForm.reset();
        this.editingProviderId.set(null);
    }

    saveProvider() {
        if (this.providerForm.invalid) {
            this.providerForm.markAllAsTouched();
            return;
        }

        const id = this.editingProviderId();
        const formValue = this.providerForm.getRawValue();
        const payload: Partial<LlmProvider> = { ...formValue };

        if (!payload.apiKey) {
            delete payload.apiKey;
        }

        if (id === null) {
            this.llmProviderStore.createProvider(payload);
            this.messageService.add({
                severity: 'success',
                summary: 'Created',
                detail: 'Provider has been created successfully.'
            });
        } else {
            this.llmProviderStore.updateProvider(id, payload);
            this.messageService.add({
                severity: 'success',
                summary: 'Updated',
                detail: 'Provider has been updated successfully.'
            });
        }

        this.closeProviderDialog();
    }

    // ── Model dialog ─────────────────────────────────────────────────

    openAddModelDialog(providerId: number) {
        this.modelForm.reset({ key: '', label: '', active: true });
        this.editingModelProviderId.set(providerId);
        this.editingModelId.set(null);
        this.modelDialogVisible.set(true);
    }

    openEditModelDialog(providerId: number, model: LlmModel) {
        this.modelForm.patchValue({
            key: model.key,
            label: model.label,
            active: model.active
        });
        this.editingModelProviderId.set(providerId);
        this.editingModelId.set(model.id);
        this.modelDialogVisible.set(true);
    }

    closeModelDialog() {
        this.modelDialogVisible.set(false);
        this.modelForm.reset();
        this.editingModelProviderId.set(null);
        this.editingModelId.set(null);
    }

    saveModel() {
        if (this.modelForm.invalid) {
            this.modelForm.markAllAsTouched();
            return;
        }

        const providerId = this.editingModelProviderId();
        if (providerId === null) return;

        const modelId = this.editingModelId();
        const payload: Partial<LlmModel> = { ...this.modelForm.getRawValue() };

        if (modelId === null) {
            this.llmProviderStore.createModel(providerId, payload);
            this.messageService.add({
                severity: 'success',
                summary: 'Created',
                detail: 'Model has been created successfully.'
            });
        } else {
            this.llmProviderStore.updateModel(providerId, modelId, payload);
            this.messageService.add({
                severity: 'success',
                summary: 'Updated',
                detail: 'Model has been updated successfully.'
            });
        }

        this.closeModelDialog();
    }

    deleteModel(providerId: number, modelId: number) {
        this.confirmService.confirm({
            message: 'Are you sure you want to deactivate this model?',
            header: 'Deactivate Model',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Deactivate',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.llmProviderStore.deleteModel(providerId, modelId);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deactivated',
                    detail: 'Model has been deactivated successfully.'
                });
            }
        });
    }

    deleteTestResult(providerId: number, modelId: number, testResultId: number) {
        this.confirmService.confirm({
            message: 'Are you sure you want to delete this test result?',
            header: 'Delete Test Result',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.llmProviderStore.deleteTestResult(providerId, modelId, testResultId);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: 'Test result has been deleted successfully.'
                });
            }
        });
    }

    deleteAllTestResults(providerId: number, modelId: number, count: number) {
        this.confirmService.confirm({
            message: `Are you sure you want to delete all ${count} test results for this model?`,
            header: 'Delete All Test Results',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete All',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.llmProviderStore.deleteAllTestResults(providerId, modelId);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: 'All test results have been deleted successfully.'
                });
            }
        });
    }

    setDefaultModel(model: LlmModel) {
        if (this.llmProviderStore.defaultModelId() === model.id) return;
        this.llmProviderStore.setDefaultModel(model.id);
        this.messageService.add({
            severity: 'success',
            summary: 'Default Set',
            detail: `"${model.label}" is now the default model.`
        });
    }
}

// Laguna M.1 - poolside/laguna-m.1:free
// gpt-oss-120b - openai/gpt-oss-120b:free
// gpt-oss-20b - openai/gpt-oss-20b:free
// Nemotron 3 Nano 30B A3B - nvidia/nemotron-3-nano-30b-a3b:free
// Nemotron 3 Nano Omni - nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
// Nemotron Nano 9B V2 - nvidia/nemotron-nano-9b-v2:free
// Nemotron Nano 12B 2 VL - nvidia/nemotron-nano-12b-v2:free
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
