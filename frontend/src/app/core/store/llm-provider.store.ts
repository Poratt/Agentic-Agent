import { Injectable, inject, signal, computed } from '@angular/core';
import { LlmProviderService, LlmProvider, LlmModel } from '../services/llm-provider.service';
import { PageStates } from '../enums/page-states.enum';
import { finalize } from 'rxjs';

export interface GroupedLlmProvider {
    label: string;
    items: LlmModel[];
}

@Injectable({
    providedIn: 'root'
})
export class LlmProviderStore {
    private llmProviderService = inject(LlmProviderService);

    // State
    private _providers = signal<LlmProvider[]>([]);
    private _loading = signal<boolean>(false);
    private _error = signal<string | null>(null);

    // Selectors
    providers = computed(() => this._providers());
    loading = computed(() => this._loading());
    error = computed(() => this._error());

    // 🚀 כאן השינוי הגדול: מיפוי נקי ללא המרות מיותרות 🚀
    groupedProviders = computed<GroupedLlmProvider[]>(() => {
        return this._providers().map(provider => ({
            label: provider.label, // כותרת הקבוצה (למשל: OpenRouter)
            items: provider.models ?? [] // הפריטים (המודלים עצמם)
        }));
    });

    pageState = computed<PageStates>(() => {
        if (this._loading() && this._providers().length === 0) {
            return PageStates.Loading;
        }

        if (this._error()) {
            return PageStates.Error;
        }

        if (this._providers().length === 0) {
            return PageStates.Empty;
        }

        return PageStates.Ready;
    });

    // Actions
    loadProviders() {
        this._loading.set(true);
        this._error.set(null);

        this.llmProviderService
            .findAll()
            .pipe(
                finalize(() => {
                    this._loading.set(false);
                })
            )
            .subscribe({
                next: (res) => {
                    this._providers.set(res.result ?? []);
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to load LLM providers');
                }
            });
    }

    createProvider(providerData: Partial<LlmProvider>) {
        this._loading.set(true);
        this.llmProviderService
            .create(providerData)
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: (res) => {
                    this._providers.update(providers => [...providers, res.result]);
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to create provider');
                }
            });
    }

    updateProvider(providerId: number, providerData: Partial<LlmProvider>) {
        this._loading.set(true);
        this.llmProviderService
            .update(providerId, providerData)
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: (res) => {
                    this._providers.update(providers =>
                        providers.map(p => p.id === res.result.id ? res.result : p)
                    );
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to update provider');
                }
            });
    }

    deleteProvider(providerId: number) {
        this._loading.set(true);
        this.llmProviderService
            .update(providerId, { active: false })
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: () => {
                    this._providers.update(providers => providers.filter(p => p.id !== providerId));
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to delete provider');
                }
            });
    }

    createModel(providerId: number, modelData: Partial<LlmModel>) {
        this._loading.set(true);
        this.llmProviderService
            .createModel(providerId, modelData)
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: (res) => {
                    this._providers.update(providers => providers.map(p => {
                        if (p.id === providerId) {
                            return { ...p, models: [...(p.models ?? []), res.result] };
                        }
                        return p;
                    }));
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to create model');
                }
            });
    }

    updateModel(providerId: number, modelId: number, modelData: Partial<LlmModel>) {
        this._loading.set(true);
        this.llmProviderService
            .updateModel(modelId, modelData)
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: (res) => {
                    this._providers.update(providers => providers.map(p => {
                        if (p.id === providerId) {
                            return {
                                ...p,
                                models: (p.models ?? []).map(m => m.id === modelId ? res.result : m)
                            };
                        }
                        return p;
                    }));
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to update model');
                }
            });
    }

    clearError() {
        this._error.set(null);
    }
}