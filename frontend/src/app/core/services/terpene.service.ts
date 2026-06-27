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

    /**
     * Fetch every terpene in the catalog, ordered alphabetically by Hebrew name.
     *
     * @returns Observable of the project-standard `ServiceResultContainer` envelope.
     */
    list(): Observable<ServiceResultContainer<ITerpene[]>> {
        return this.http.get<ServiceResultContainer<ITerpene[]>>(this.base);
    }
}