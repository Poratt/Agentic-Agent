import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { Observable } from 'rxjs';

export interface LlmModel {
    id: number;
    key: string;
    label: string;
    active: boolean;
    sortOrder: number;
    providerId: number;
    createdAt: string;
    updatedAt: string;
    testResults?: any[];
}

export interface LlmProvider {
    id: number;
    key: string;
    label: string;
    baseUrl: string;
    apiKey?: string;
    active: boolean;
    models?: LlmModel[];
    createdAt: string;
    updatedAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class LlmProviderService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/llm-provider`;

    create(provider: Partial<LlmProvider>): Observable<ServiceResultContainer<LlmProvider>> {
        return this.http.post<ServiceResultContainer<LlmProvider>>(`${this.base}`, provider);
    }

    findAll(): Observable<ServiceResultContainer<LlmProvider[]>> {
        return this.http.get<ServiceResultContainer<LlmProvider[]>>(`${this.base}`);
    }

    update(id: number, provider: Partial<LlmProvider>): Observable<ServiceResultContainer<LlmProvider>> {
        return this.http.patch<ServiceResultContainer<LlmProvider>>(`${this.base}/${id}`, provider);
    }

    createModel(providerId: number, model: Partial<LlmModel>): Observable<ServiceResultContainer<LlmModel>> {
        return this.http.post<ServiceResultContainer<LlmModel>>(`${this.base}/${providerId}/models`, model);
    }

    updateModel(modelId: number, model: Partial<LlmModel>): Observable<ServiceResultContainer<LlmModel>> {
        return this.http.patch<ServiceResultContainer<LlmModel>>(`${this.base}/models/${modelId}`, model);
    }

    deleteModel(modelId: number): Observable<ServiceResultContainer<void>> {
        return this.http.patch<ServiceResultContainer<void>>(`${this.base}/models/${modelId}`, { active: false } as Partial<LlmModel>);
    }

    findModels(providerId: number): Observable<ServiceResultContainer<LlmModel[]>> {
        return this.http.get<ServiceResultContainer<LlmModel[]>>(`${this.base}/${providerId}/models`);
    }

    testModel(modelId: number): Observable<ServiceResultContainer<any>> {
        return this.http.post<ServiceResultContainer<any>>(`${environment.apiUrl}/llm/models/${modelId}/test`, {});
    }

    deleteTestResult(testResultId: number): Observable<ServiceResultContainer<void>> {
        return this.http.delete<ServiceResultContainer<void>>(`${environment.apiUrl}/llm/test-results/${testResultId}`);
    }
}
