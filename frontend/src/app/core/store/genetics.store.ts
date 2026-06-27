import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { IGenetics } from '../models/genetics.interface';
import { GeneticsService } from '../services/genetics.service';

/**
 * Signal store for the genetics/strain reference catalog.
 *
 * The catalog is small and rarely changes, so the store caches the
 * loaded list in memory: subsequent `loadAll()` calls after the first
 * successful fetch are no-ops, and concurrent callers share a single
 * in-flight request via the `loading` guard.
 */
@Injectable({ providedIn: 'root' })
export class GeneticsStore {
    private service = inject(GeneticsService);

    genetics = signal<IGenetics[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    /** Lookup table keyed by normalized Hebrew name. Recomputed only when `genetics` changes. */
    readonly byName = computed<ReadonlyMap<string, IGenetics>>(() => {
        const map = new Map<string, IGenetics>();
        for (const g of this.genetics()) {
            const normalized = g.name.trim().toLowerCase().replace(/[׀-׿]+/g, (m) => m).replace(/[^֐-׿\s]/g, ' ').replace(/\s+/g, ' ').trim();
            map.set(normalized, g);
        }
        return map;
    });

    /**
     * Look up a genetics row by its Hebrew name (normalized).
     *
     * @param name Hebrew name as stored on `IGenetics.name`.
     * @returns The matching row, or `undefined` if no record matches.
     */
    getByName(name: string): IGenetics | undefined {
        const normalized = name.trim().toLowerCase().replace(/[^֐-׿\s]/g, ' ').replace(/\s+/g, ' ').trim();
        return this.byName().get(normalized);
    }

    /**
     * Fetch the catalog from the backend, unless it has already been loaded
     * or a request is already in flight.
     */
    loadAll(): void {
        if (this.genetics().length > 0 || this.loading()) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.service.list().subscribe({
            next: (res) => {
                this.genetics.set(res?.result ?? []);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(this.extractMessage(err, 'טעינת גנטיקות נכשלה'));
                this.loading.set(false);
            },
        });
    }

    clearError(): void {
        this.error.set(null);
    }

    private extractMessage(error: unknown, fallback: string): string {
        if (error instanceof HttpErrorResponse) {
            const body = error.error;
            if (body && typeof body.message === 'string') {
                return body.message;
            }
            if (typeof body === 'string') {
                return body;
            }
        }
        return fallback;
    }
}