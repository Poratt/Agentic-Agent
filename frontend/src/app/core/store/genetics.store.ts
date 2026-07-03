import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { IGenetics } from '../models/genetics.interface';
import { GeneticsService } from '../services/genetics.service';

@Injectable({ providedIn: 'root' })
export class GeneticsStore {
    private service = inject(GeneticsService);

    genetics = signal<IGenetics[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    readonly byName = computed<ReadonlyMap<string, IGenetics>>(() => {
        const map = new Map<string, IGenetics>();
        for (const g of this.genetics()) {
            const normalized = g.name
                .trim()
                .toLowerCase()
                .replace(/[^א-תa-zA-Z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            map.set(normalized, g);
        }
        return map;
    });

    getByName(name: string): IGenetics | undefined {
        const normalized = name
            .trim()
            .toLowerCase()
            .replace(/[^א-תa-zA-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return this.byName().get(normalized);
    }

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