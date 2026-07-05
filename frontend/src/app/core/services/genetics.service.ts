import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { IGenetics } from '../models/genetics.interface';

/**
 * HTTP client for the genetics/strain reference catalog exposed by the backend
 * at `/genetics` (JwtAuthGuard protected).
 *
 * The catalog is intended to be cached client-side for the lifetime of the
 * session via `GeneticsStore`.
 */
@Injectable({ providedIn: 'root' })
export class GeneticsService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/genetics`;

    list(): Observable<ServiceResultContainer<IGenetics[]>> {
        return this.http.get<ServiceResultContainer<IGenetics[]>>(this.base);
    }

    update(name: string, data: Partial<IGenetics>): Observable<ServiceResultContainer<IGenetics>> {
        return this.http.patch<ServiceResultContainer<IGenetics>>(`${this.base}/${encodeURIComponent(name)}`, data);
    }

    enrich(name: string): Observable<ServiceResultContainer<IGenetics>> {
        return this.http.post<ServiceResultContainer<IGenetics>>(`${this.base}/${encodeURIComponent(name)}/enrich`, {});
    }

    enrichMissing(): Observable<ServiceResultContainer<{ total: number; enriched: number; errors: number }>> {
        return this.http.post<ServiceResultContainer<{ total: number; enriched: number; errors: number }>>(`${this.base}/enrich-missing`, {});
    }

    delete(name: string): Observable<ServiceResultContainer<void>> {
        return this.http.delete<ServiceResultContainer<void>>(`${this.base}/${encodeURIComponent(name)}`);
    }
}