import { Injectable, inject, signal, computed } from '@angular/core';
import { CreateProviderDto, UpdateProviderDto, CreateModelDto, UpdateModelDto } from '../models/llm.models';
import { LlmService } from '../services/llm.service';
import { ProviderResponseDto } from '../models/llm.models';
import { PageStates } from '../enums/page-states.enum';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LlmAdminStore {
  // New signals for models per provider
  private _modelsByProvider = signal<Record<number, any[]>>({});
  private _modelsLoading = signal<Record<number, boolean>>({});
  private _modelsError = signal<Record<number, string | null>>({});

  // Selectors for models
  models(providerId: number) {
    return computed(() => this._modelsByProvider()[providerId] ?? []);
  }
  modelsLoading(providerId: number) {
    return computed(() => this._modelsLoading()[providerId] ?? false);
  }
  modelsError(providerId: number) {
    return computed(() => this._modelsError()[providerId] ?? null);
  }

  private llmService = inject(LlmService);

  // State
  private _providers = signal<ProviderResponseDto[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Selectors
  providers = computed(() => this._providers());
  loading = computed(() => this._loading());
  error = computed(() => this._error());

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

    this.llmService
      .getAdminProviders()
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (res) => {
          this._providers.set(res.result ?? []);
        },
        error: (err) => {
          this._error.set(err?.error?.message ?? 'Failed to load providers');
        },
      });
  }

  // Create provider
  createProvider(dto: CreateProviderDto) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .createProvider(dto)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadProviders(),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to create provider'),
      });
  }

  // Update provider
  updateProvider(id: number, dto: UpdateProviderDto) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .updateProvider(id, dto)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadProviders(),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to update provider'),
      });
  }

  // Disable / enable provider
  disableProvider(id: number) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .disableProvider(id)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadProviders(),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to disable provider'),
      });
  }

  // Load models for a provider
  loadModels(providerId: number) {
    const loadingMap = { ...this._modelsLoading() };
    loadingMap[providerId] = true;
    this._modelsLoading.set(loadingMap);
    const errorMap = { ...this._modelsError() };
    errorMap[providerId] = null;
    this._modelsError.set(errorMap);
    this.llmService
      .getProviderModels(providerId)
      .pipe(finalize(() => {
        const lm = { ...this._modelsLoading() };
        lm[providerId] = false;
        this._modelsLoading.set(lm);
      }))
      .subscribe({
        next: (res) => {
          const map = { ...this._modelsByProvider() };
          map[providerId] = res.result ?? [];
          this._modelsByProvider.set(map);
        },
        error: (err) => {
          const errMap = { ...this._modelsError() };
          errMap[providerId] = err?.error?.message ?? 'Failed to load models';
          this._modelsError.set(errMap);
        },
      });
  }

  // Set default model
  setDefaultModel(providerId: number, modelId: number) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .setDefaultModel(providerId, modelId)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadProviders(),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to set default model'),
      });
  }

  // Create model
  createModel(providerId: number, dto: CreateModelDto) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .createModel(providerId, dto)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadModels(providerId),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to create model'),
      });
  }

  // Update model
  updateModel(id: number, dto: UpdateModelDto) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .updateModel(id, dto)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadProviders(),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to update model'),
      });
  }

  // Disable model
  disableModel(id: number) {
    this._loading.set(true);
    this._error.set(null);
    this.llmService
      .disableModel(id)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: () => this.loadProviders(),
        error: (err) => this._error.set(err?.error?.message ?? 'Failed to disable model'),
      });
  }

  clearError() {
    this._error.set(null);
  }
}
