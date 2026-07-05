import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { GeneticsStore } from '../../../core/store/genetics.store';
import { TerpeneStore } from '../../../core/store/terpene.store';
import { GeneticsService } from '../../../core/services/genetics.service';
import { TerpeneService } from '../../../core/services/terpene.service';
import { IGenetics } from '../../../core/models/genetics.interface';
import { ITerpene } from '../../../core/models/terpene.interface';

@Component({
    selector: 'app-strain-hunter-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, Tabs, TabList, Tab, TabPanels, TabPanel, InputTextModule],
    templateUrl: './strain-hunter-settings.html',
    styleUrls: ['./strain-hunter-settings.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class StrainHunterSettings implements OnInit, OnDestroy {
    private readonly geneticsStore = inject(GeneticsStore);
    private readonly terpeneStore = inject(TerpeneStore);
    private readonly geneticsService = inject(GeneticsService);
    private readonly terpeneService = inject(TerpeneService);
    private readonly mql = window.matchMedia('(max-width: 1599px)');
    private readonly mqlHandler = () => this.isCompact.set(this.mql.matches);

    geneticsFilter = signal('');
    terpeneFilter = signal('');
    expandedGenetics = signal<Set<number>>(new Set());
    expandedTerpenes = signal<Set<number>>(new Set());
    enrichedGenetics = signal<Map<number, IGenetics>>(new Map());
    enrichedTerpenes = signal<Map<number, ITerpene>>(new Map());
    enrichingIds = signal<Set<string>>(new Set());
    bulkEnriching = signal<'genetics' | 'terpenes' | null>(null);
    bulkResult = signal<{ total: number; enriched: number; errors: number } | null>(null);
    isCompact = signal(false);

    filteredGenetics = computed<IGenetics[]>(() => {
        const q = this.geneticsFilter().toLowerCase();
        const items = this.geneticsStore.genetics();
        if (!q) return items;
        return items.filter(g =>
            g.name.toLowerCase().includes(q) ||
            g.origin?.toLowerCase().includes(q) ||
            g.type?.toLowerCase().includes(q) ||
            g.parent1?.toLowerCase().includes(q) ||
            g.parent2?.toLowerCase().includes(q)
        );
    });

    filteredTerpenes = computed<ITerpene[]>(() => {
        const q = this.terpeneFilter().toLowerCase();
        const items = this.terpeneStore.terpenes();
        if (!q) return items;
        return items.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.scent?.toLowerCase().includes(q) ||
            t.effects?.some(e => e.toLowerCase().includes(q))
        );
    });

    ngOnInit(): void {
        this.isCompact.set(this.mql.matches);
        this.mql.addEventListener('change', this.mqlHandler);
        this.geneticsStore.loadAll();
        this.terpeneStore.loadAll();
    }

    ngOnDestroy(): void {
        this.mql.removeEventListener('change', this.mqlHandler);
    }

    isGeneticsExpanded(id: number): boolean {
        return this.isCompact() || this.expandedGenetics().has(id);
    }

    isTerpeneExpanded(id: number): boolean {
        return this.isCompact() || this.expandedTerpenes().has(id);
    }

    toggleGenetics(id: number): void {
        this.expandedGenetics.update(set => {
            const next = new Set(set);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    toggleTerpene(id: number): void {
        this.expandedTerpenes.update(set => {
            const next = new Set(set);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    isEnriching(key: string): boolean {
        return this.enrichingIds().has(key);
    }

    getEnrichedGenetics(id: number): IGenetics | undefined {
        return this.enrichedGenetics().get(id);
    }

    hasEnrichedGenetics(id: number): boolean {
        return this.enrichedGenetics().has(id);
    }

    getEnrichedTerpene(id: number): ITerpene | undefined {
        return this.enrichedTerpenes().get(id);
    }

    hasEnrichedTerpene(id: number): boolean {
        return this.enrichedTerpenes().has(id);
    }

    onGeneticsFilter(value: string): void {
        this.geneticsFilter.set(value);
    }

    onTerpeneFilter(value: string): void {
        this.terpeneFilter.set(value);
    }

    clearGeneticsFilter(): void {
        this.geneticsFilter.set('');
    }

    clearTerpeneFilter(): void {
        this.terpeneFilter.set('');
    }

    getThemeColor(item: { colorDark: string; colorLight: string }): string {
        return item.colorDark;
    }

    saveEnrichedGenetics(g: IGenetics): void {
        const enriched = this.getEnrichedGenetics(g.id);
        if (!enriched) return;
        this.geneticsStore.update(g.name, {
            description: enriched.description,
            parent1: enriched.parent1,
            parent2: enriched.parent2,
            origin: enriched.origin,
            type: enriched.type,
            thcRange: enriched.thcRange,
            terpenes: enriched.terpenes,
            effects: enriched.effects,
            color: enriched.color,
            colorDark: enriched.colorDark,
            colorLight: enriched.colorLight,
        });
        this.enrichedGenetics.update(map => {
            const next = new Map(map);
            next.delete(g.id);
            return next;
        });
    }

    saveEnrichedTerpene(t: ITerpene): void {
        const enriched = this.getEnrichedTerpene(t.id);
        if (!enriched) return;
        this.terpeneStore.update(t.name, {
            description: enriched.description,
            scent: enriched.scent,
            effects: enriched.effects,
            color: enriched.color,
            colorDark: enriched.colorDark,
            colorLight: enriched.colorLight,
        });
        this.enrichedTerpenes.update(map => {
            const next = new Map(map);
            next.delete(t.id);
            return next;
        });
    }

    discardEnrichedGenetics(id: number): void {
        this.enrichedGenetics.update(map => {
            const next = new Map(map);
            next.delete(id);
            return next;
        });
    }

    discardEnrichedTerpene(id: number): void {
        this.enrichedTerpenes.update(map => {
            const next = new Map(map);
            next.delete(id);
            return next;
        });
    }

    async regenerateGenetics(g: IGenetics): Promise<void> {
        const key = `g-${g.id}`;
        if (this.isEnriching(key)) return;

        this.enrichingIds.update(set => new Set(set).add(key));
        try {
            const result = await this.geneticsStore.enrich(g.name);
            if (result) {
                this.enrichedGenetics.update(map => {
                    const next = new Map(map);
                    next.set(g.id, result);
                    return next;
                });
            }
        } catch {
            // Error handled by store
        } finally {
            this.enrichingIds.update(set => {
                const next = new Set(set);
                next.delete(key);
                return next;
            });
        }
    }

    async regenerateTerpene(t: ITerpene): Promise<void> {
        const key = `t-${t.id}`;
        if (this.isEnriching(key)) return;

        this.enrichingIds.update(set => new Set(set).add(key));
        try {
            const result = await this.terpeneStore.enrich(t.name);
            if (result) {
                this.enrichedTerpenes.update(map => {
                    const next = new Map(map);
                    next.set(t.id, result);
                    return next;
                });
            }
        } catch {
            // Error handled by store
        } finally {
            this.enrichingIds.update(set => {
                const next = new Set(set);
                next.delete(key);
                return next;
            });
        }
    }

    onRowRegenerate(t: ITerpene): void {
        if (!this.isTerpeneExpanded(t.id)) {
            this.toggleTerpene(t.id);
        }
        this.regenerateTerpene(t);
    }

    onRowRegenerateGenetics(g: IGenetics): void {
        if (!this.isGeneticsExpanded(g.id)) {
            this.toggleGenetics(g.id);
        }
        this.regenerateGenetics(g);
    }

    async bulkEnrichGenetics(): Promise<void> {
        if (this.bulkEnriching()) return;
        this.bulkEnriching.set('genetics');
        this.bulkResult.set(null);
        try {
            const result = await firstValueFrom(this.geneticsService.enrichMissing());
            if (result.success && result.result) {
                this.bulkResult.set(result.result);
                await this.geneticsStore.loadAll();
            }
        } catch {
            // Error handled by store
        } finally {
            this.bulkEnriching.set(null);
        }
    }

    async bulkEnrichTerpenes(): Promise<void> {
        if (this.bulkEnriching()) return;
        this.bulkEnriching.set('terpenes');
        this.bulkResult.set(null);
        try {
            const result = await firstValueFrom(this.terpeneService.enrichMissing());
            if (result.success && result.result) {
                this.bulkResult.set(result.result);
                await this.terpeneStore.loadAll();
            }
        } catch {
            // Error handled by store
        } finally {
            this.bulkEnriching.set(null);
        }
    }

    async deleteGenetics(g: IGenetics): Promise<void> {
        if (!confirm(`למחוק את "${g.name}"?`)) return;
        try {
            await this.geneticsStore.delete(g.name);
            this.expandedGenetics.update(set => {
                const next = new Set(set);
                next.delete(g.id);
                return next;
            });
        } catch {
            // Error handled by store
        }
    }

    async deleteTerpene(t: ITerpene): Promise<void> {
        if (!confirm(`למחוק את "${t.name}"?`)) return;
        try {
            await this.terpeneStore.delete(t.name);
            this.expandedTerpenes.update(set => {
                const next = new Set(set);
                next.delete(t.id);
                return next;
            });
        } catch {
            // Error handled by store
        }
    }
}
