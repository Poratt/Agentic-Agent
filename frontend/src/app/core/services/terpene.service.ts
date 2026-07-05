import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { ITerpene } from '../models/terpene.interface';

/**
 * HTTP client for the terpene reference catalog exposed by the backend
 * at `/terpenes` (JwtAuthGuard protected).
 *
 * The catalog is small (~17 rows) and intended to be cached client-side
 * for the lifetime of the session via `TerpeneStore`.
 */
@Injectable({ providedIn: 'root' })
export class TerpeneService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/terpenes`;

    list(): Observable<ServiceResultContainer<ITerpene[]>> {
        return this.http.get<ServiceResultContainer<ITerpene[]>>(this.base);
    }

    update(name: string, data: Partial<ITerpene>): Observable<ServiceResultContainer<ITerpene>> {
        return this.http.patch<ServiceResultContainer<ITerpene>>(`${this.base}/${encodeURIComponent(name)}`, data);
    }

    enrich(name: string): Observable<ServiceResultContainer<ITerpene>> {
        return this.http.post<ServiceResultContainer<ITerpene>>(`${this.base}/${encodeURIComponent(name)}/enrich`, {});
    }

    enrichMissing(): Observable<ServiceResultContainer<{ total: number; enriched: number; errors: number }>> {
        return this.http.post<ServiceResultContainer<{ total: number; enriched: number; errors: number }>>(`${this.base}/enrich-missing`, {});
    }

    delete(name: string): Observable<ServiceResultContainer<void>> {
        return this.http.delete<ServiceResultContainer<void>>(`${this.base}/${encodeURIComponent(name)}`);
    }
}