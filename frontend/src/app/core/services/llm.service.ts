import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ProviderResponseDto,
  CreateProviderDto,
  UpdateProviderDto,
  ModelResponseDto,
  CreateModelDto,
  UpdateModelDto,
  StartTestRunDto,
  TestRunDto,
  TestResultDto,
  ModelRankingDto,
  OllamaRuntimeModelDto,
} from '../models/llm.models';
import { ServiceResultContainer } from '../models/service-result-container.model';

export type LlmProviderLabel = 'openrouter' | 'nvidia' | 'ollama';

export interface LlmModelOption {
  id?: string;
  provider?: LlmProviderLabel;
  value: string;
  label: string;
}

export interface LlmModelGroup {
  label: LlmProviderLabel;
  items: LlmModelOption[];
}

export interface LlmStatus {
  activeProvider: LlmProviderLabel;
  activeModel: string;
}

@Injectable({ providedIn: 'root' })
export class LlmService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/llm`;

  // Public chat endpoints
  getModelOptions(): Observable<ServiceResultContainer<LlmModelGroup[]>> {
    return this.http.get<ServiceResultContainer<LlmModelGroup[]>>(`${this.base}/model-options`);
  }

  getStatus(): Observable<ServiceResultContainer<LlmStatus>> {
    return this.http.get<ServiceResultContainer<LlmStatus>>(`${this.base}/status`);
  }

  // ---- Admin endpoints (Phase 7) ----
  getAdminProviders(): Observable<ServiceResultContainer<ProviderResponseDto[]>> {
    return this.http.get<ServiceResultContainer<ProviderResponseDto[]>>(`${this.base}/admin/providers`);
  }

  createProvider(dto: CreateProviderDto): Observable<ServiceResultContainer<ProviderResponseDto>> {
    return this.http.post<ServiceResultContainer<ProviderResponseDto>>(`${this.base}/admin/providers`, dto);
  }

  updateProvider(id: number, dto: UpdateProviderDto): Observable<ServiceResultContainer<ProviderResponseDto>> {
    return this.http.patch<ServiceResultContainer<ProviderResponseDto>>(`${this.base}/admin/providers/${id}`, dto);
  }

  disableProvider(id: number): Observable<ServiceResultContainer<void>> {
    return this.http.delete<ServiceResultContainer<void>>(`${this.base}/admin/providers/${id}`);
  }

  getProviderModels(providerId: number): Observable<ServiceResultContainer<ModelResponseDto[]>> {
    return this.http.get<ServiceResultContainer<ModelResponseDto[]>>(`${this.base}/admin/providers/${providerId}/models`);
  }

  createModel(providerId: number, dto: CreateModelDto): Observable<ServiceResultContainer<ModelResponseDto>> {
    return this.http.post<ServiceResultContainer<ModelResponseDto>>(`${this.base}/admin/providers/${providerId}/models`, dto);
  }

  updateModel(id: number, dto: UpdateModelDto): Observable<ServiceResultContainer<ModelResponseDto>> {
    return this.http.patch<ServiceResultContainer<ModelResponseDto>>(`${this.base}/admin/models/${id}`, dto);
  }

  disableModel(id: number): Observable<ServiceResultContainer<void>> {
    return this.http.delete<ServiceResultContainer<void>>(`${this.base}/admin/models/${id}`);
  }

  setDefaultModel(providerId: number, modelId: number): Observable<ServiceResultContainer<void>> {
    return this.http.patch<ServiceResultContainer<void>>(`${this.base}/admin/providers/${providerId}/default-model/${modelId}`, {});
  }

  startModelTestRun(dto: StartTestRunDto): Observable<ServiceResultContainer<TestRunDto>> {
    return this.http.post<ServiceResultContainer<TestRunDto>>(`${this.base}/admin/test-runs`, dto);
  }

  getModelTestRuns(): Observable<ServiceResultContainer<TestRunDto[]>> {
    return this.http.get<ServiceResultContainer<TestRunDto[]>>(`${this.base}/admin/test-runs`);
  }

  getModelTestRunResults(runId: number): Observable<ServiceResultContainer<TestResultDto[]>> {
    return this.http.get<ServiceResultContainer<TestResultDto[]>>(`${this.base}/admin/test-runs/${runId}/results`);
  }

  getModelRankings(): Observable<ServiceResultContainer<ModelRankingDto[]>> {
    return this.http.get<ServiceResultContainer<ModelRankingDto[]>>(`${this.base}/admin/model-rankings`);
  }

  getOllamaRuntimeModels(): Observable<ServiceResultContainer<OllamaRuntimeModelDto[]>> {
    return this.http.get<ServiceResultContainer<OllamaRuntimeModelDto[]>>(`${this.base}/admin/runtime-models/ollama`);
  }
}
