import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
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

@Injectable({
	providedIn: 'root',
})
export class LlmService {
	private http = inject(HttpClient);
	private base = `${environment.apiUrl}/llm`;

	getModelOptions(): Observable<ServiceResultContainer<LlmModelGroup[]>> {
		return this.http.get<ServiceResultContainer<LlmModelGroup[]>>(`${this.base}/model-options`);
	}

	getStatus(): Observable<ServiceResultContainer<LlmStatus>> {
		return this.http.get<ServiceResultContainer<LlmStatus>>(`${this.base}/status`);
	}
}
