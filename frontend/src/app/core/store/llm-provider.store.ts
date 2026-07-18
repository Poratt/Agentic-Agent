import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { LlmProviderService, LlmProvider, LlmModel } from '../../core/services/llm-provider.service';
import { PageStates } from '../../core/enums/page-states.enum';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { environment } from '../../environments/environment';

export interface GroupedLlmProviderModel extends LlmModel {
    performanceScore: number;
    performancePercentage: number;
    latencyAverageMs: number;
}

export interface GroupedLlmProvider {
    label: string;
    items: GroupedLlmProviderModel[];
}

@Injectable({
    providedIn: 'root'
})
export class LlmProviderStore {
    private llmProviderService = inject(LlmProviderService);

    providersResource = httpResource<ServiceResultContainer<LlmProvider[]>>(() => `${environment.apiUrl}/llm-provider`);

    providers = computed(() => this.providersResource.value()?.result ?? []);
    loading = computed(() => this.providersResource.isLoading());
    error = signal<string | null>(null);

    defaultModelId = signal<number | null>(null);

    loadUserDefaultModel(): void {
        this.llmProviderService.getUserDefaultModel().subscribe({
            next: (res) => {
                this.defaultModelId.set(res.result?.id ?? null);
            },
            error: () => {
                this.defaultModelId.set(null);
            }
        });
    }

    setDefaultModel(modelId: number): void {
        this.llmProviderService.setUserDefaultModel(modelId).subscribe({
            next: () => {
                this.defaultModelId.set(modelId);
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to set default model');
            }
        });
    }

    groupedProviders = computed<GroupedLlmProvider[]>(() => {
        return this.providers()
            .filter(provider => provider.active)
            .map(provider => ({
                label: provider.label,
                items: (provider.models ?? [])
                    .filter(model => model.active)
                    .map(model => {
                        const results = model.testResults || [];
                        const totalTests = results.length;
                        if (totalTests === 0) {
                            return { ...model, performanceScore: -1, performancePercentage: 0, latencyAverageMs: 0 };
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
                            performanceScore: (successPercentage * 100000) - latencyAverage,
                            performancePercentage: successPercentage,
                            latencyAverageMs: latencyAverage
                        };
                    })
                    .sort((a, b) => b.performanceScore - a.performanceScore)
            }))
            .filter(provider => (provider.items?.length ?? 0) > 0);
    });

    pageState = computed<PageStates>(() => {
        if (this.loading() && this.providers().length === 0) {
            return PageStates.Loading;
        }

        if (this.error()) {
            return PageStates.Error;
        }

        if (this.providers().length === 0) {
            return PageStates.Empty;
        }

        return PageStates.Ready;
    });

    reload(): void {
        this.providersResource.reload();
    }

    clearError() {
        this.error.set(null);
    }

    createProvider(providerData: Partial<LlmProvider>) {
        this.llmProviderService.create(providerData).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to create provider');
            }
        });
    }

    updateProvider(providerId: number, providerData: Partial<LlmProvider>) {
        this.llmProviderService.update(providerId, providerData).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to update provider');
            }
        });
    }

    deleteProvider(providerId: number) {
        this.llmProviderService.update(providerId, { active: false }).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to delete provider');
            }
        });
    }

    createModel(providerId: number, modelData: Partial<LlmModel>) {
        this.llmProviderService.createModel(providerId, modelData).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to create model');
            }
        });
    }

    deleteModel(providerId: number, modelId: number) {
        this.llmProviderService.deleteModel(modelId).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to delete model');
            }
        });
    }

    deleteTestResult(providerId: number, modelId: number, testResultId: number) {
        this.llmProviderService.deleteTestResult(testResultId).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to delete test result');
            }
        });
    }

    updateModel(providerId: number, modelId: number, modelData: Partial<LlmModel>) {
        this.llmProviderService.updateModel(modelId, modelData).subscribe({
            next: () => {
                this.providersResource.reload();
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to update model');
            }
        });
    }
}