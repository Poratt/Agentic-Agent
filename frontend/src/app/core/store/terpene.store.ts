import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ITerpene } from '../models/terpene.interface';
import { TerpeneService } from '../services/terpene.service';

/**
 * Signal store for the terpene reference catalog.
 *
 * The catalog is small and rarely changes, so the store caches the
 * loaded list in memory: subsequent `loadAll()` calls after the first
 * successful fetch are no-ops, and concurrent callers share a single
 * in-flight request via the `loading` guard.
 */
@Injectable({ providedIn: 'root' })
export class TerpeneStore {
    private service = inject(TerpeneService);

    terpenes = signal<ITerpene[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    /** Lookup table keyed by normalized Hebrew name. Recomputed only when `terpenes` changes. */
    readonly byName = computed<ReadonlyMap<string, ITerpene>>(() => {
        const map = new Map<string, ITerpene>();
        for (const t of this.terpenes()) {
            const normalized = t.name.trim().toLowerCase().replace(/[^֐-׿\s]/g, ' ').replace(/\s+/g, ' ').trim();
            map.set(normalized, t);
        }
        return map;
    });

    /**
     * Look up a terpene by its Hebrew name (normalized).
     *
     * @param name Hebrew name as stored on `ITerpene.name`.
     * @returns The matching terpene, or `undefined` if no record matches.
     */
    getByName(name: string): ITerpene | undefined {
        const normalized = name.trim().toLowerCase().replace(/[^֐-׿\s]/g, ' ').replace(/\s+/g, ' ').trim();
        return this.byName().get(normalized);
    }

    /**
     * Fetch the catalog from the backend, unless it has already been loaded
     * or a request is already in flight.
     */
    loadAll(): void {
        if (this.terpenes().length > 0 || this.loading()) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.service.list().subscribe({
            next: (res) => {
                this.terpenes.set(res?.result ?? []);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.error.set(this.extractMessage(err, 'טעינת טרפנים נכשלה'));
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