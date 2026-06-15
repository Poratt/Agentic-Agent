import { Injectable, inject, signal, computed } from '@angular/core';
import { LlmProviderService, LlmProvider, LlmModel } from '../services/llm-provider.service';
import { LlmModelGroup, LlmModelOption, LlmService, LlmStatus } from '../../core/services/llm.service';
import { PageStates } from '../enums/page-states.enum';
import { finalize } from 'rxjs';

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
    providers = computed(() => {
        return this._providers();
    });

    loading = computed(() => {
        return this._loading();
    });

    error = computed(() => {
        return this._error();
    });


    groupedProviders = computed<LlmModelGroup[]>(() => {
        return this._providers().map(provider => {
            return {
                label: provider.key,
                items: provider.models?.map(model => {
                    return {
                        id: `${provider.key}::${model.key}`,
                        provider: provider.key,
                        value: model.key,
                        label: model.label
                    };
                }) ?? []
            };
        });
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
            .pipe(
                finalize(() => {
                    this._loading.set(false);
                })
            )
            .subscribe({
                next: (res) => {
                    const newProvider = res.result;
                    this._providers.update((providers) => {
                        return [...providers, newProvider];
                    });
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
            .pipe(
                finalize(() => {
                    this._loading.set(false);
                })
            )
            .subscribe({
                next: (res) => {
                    const updatedProvider = res.result;
                    this._providers.update((providers) => {
                        return providers.map((p) => {
                            return p.id === updatedProvider.id ? updatedProvider : p;
                        });
                    });
                },
                error: (err) => {
                    this._error.set(err?.error?.message ?? 'Failed to update provider');
                }
            });
    }

    deleteProvider(providerId: number) {
        this._loading.set(true);
        // בהנחה שקיים מימוש מחיקה תואם ב-Service
        this.llmProviderService
            .update(providerId, { active: false })
            .pipe(
                finalize(() => {
                    this._loading.set(false);
                })
            )
            .subscribe({
                next: () => {
                    this._providers.update((providers) => {
                        return providers.filter((p) => {
                            return p.id !== providerId;
                        });
                    });
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
            .pipe(
                finalize(() => {
                    this._loading.set(false);
                })
            )
            .subscribe({
                next: (res) => {
                    const newModel = res.result;
                    this._providers.update((providers) => {
                        return providers.map((p) => {
                            if (p.id === providerId) {
                                const currentModels = p.models ?? [];
                                return {
                                    ...p,
                                    models: [...currentModels, newModel]
                                };
                            }
                            return p;
                        });
                    });
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
            .pipe(
                finalize(() => {
                    this._loading.set(false);
                })
            )
            .subscribe({
                next: (res) => {
                    const updatedModel = res.result;
                    this._providers.update((providers) => {
                        return providers.map((p) => {
                            if (p.id === providerId) {
                                const currentModels = p.models ?? [];
                                return {
                                    ...p,
                                    models: currentModels.map((m) => {
                                        return m.id === modelId ? updatedModel : m;
                                    })
                                };
                            }
                            return p;
                        });
                    });
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