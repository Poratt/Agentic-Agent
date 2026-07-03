import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ITerpene } from '../models/terpene.interface';
import { TerpeneService } from '../services/terpene.service';

@Injectable({ providedIn: 'root' })
export class TerpeneStore {
    private service = inject(TerpeneService);

    terpenes = signal<ITerpene[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    readonly byName = computed<ReadonlyMap<string, ITerpene>>(() => {
        const map = new Map<string, ITerpene>();
        for (const t of this.terpenes()) {
            const normalized = t.name
                .trim()
                .toLowerCase()
                .replace(/[^א-תa-zA-Z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            map.set(normalized, t);
        }
        return map;
    });

    getByName(name: string): ITerpene | undefined {
        const normalized = name
            .trim()
            .toLowerCase()
            .replace(/[^א-תa-zA-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return this.byName().get(normalized);
    }

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