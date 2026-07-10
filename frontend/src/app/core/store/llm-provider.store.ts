import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { LlmProviderService, LlmProvider, LlmModel } from '../../core/services/llm-provider.service';
import { PageStates } from '../../core/enums/page-states.enum';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { environment } from '../../environments/environment';

export interface GroupedLlmProvider {
    label: string;
    items: LlmModel[];
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

    groupedProviders = computed<GroupedLlmProvider[]>(() => {
        return this.providers().map(provider => ({
            label: provider.label,
            items: provider.models ?? []
        }));
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