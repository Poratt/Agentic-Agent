import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import type { SortEvent } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageStates } from '../../core/enums/page-states.enum';
import { MatchingEngineStore, ScoredStrain, ScoreBreakdown } from '../../core/store/matching-engine.store';
import { TerpeneStore } from '../../core/store/terpene.store';
import { GeneticsStore } from '../../core/store/genetics.store';
import { Tooltip, TooltipCategory } from '../../components/shared/tooltip/tooltip';
import { ScoreTooltip } from '../../components/shared/score-tooltip/score-tooltip';
import { MatchingPreferencesDrawer } from './matching-preferences-drawer/matching-preferences-drawer';

type ScoreTooltipPos = {
    breakdown: ScoreBreakdown;
    top: number;
    left: number;
};

type TooltipPos = {
    name: string;
    category: TooltipCategory;
    top: number;
    left: number;
};

type StrainRow = ScoredStrain<Record<string, unknown>>;

type StrainHunterResponse = {
    items: Record<string, unknown>[];
};

type StrainHunterFilterField =
    | 'originStrain'
    | 'parent1'
    | 'parent2'
    | 'marketer'
    | 'manufacturer'
    | 'brand'
    | 'packageType'
    | 'countryOfOrigin'
    | 'terpenes'
    | 'isNew'
    | 'category'
    | 'family'
    | 'growType';

type StrainHunterFilter = {
    key: string;
    fields: StrainHunterFilterField[];
    label: string;
    value: string;
};

type TerpeneFilter = {
    name: string;
    label: string;
};

const TOOLTIP_W = 240;
const TOOLTIP_GAP = 8;
const TOOLTIP_DELAY_MS = 500;

@Component({
    selector: 'app-strain-hunter',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        InputTextModule,
        TooltipModule,
        DialogModule,
        MatchingPreferencesDrawer,
        Tooltip,
        ScoreTooltip
    ],
    templateUrl: './strain-hunter.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./strain-hunter.css'],
})
export class StrainHunter implements OnInit {
    private http = inject(HttpClient);
    private matchingEngine = inject(MatchingEngineStore);
    private readonly terpeneStore = inject(TerpeneStore);
    private readonly geneticsStore = inject(GeneticsStore);
    private base = `${environment.apiUrl}/strain-hunter`;
    private table = viewChild<Table>('table');
    private requestSubscription: Subscription | null = null;
    private readonly numericSortColumns = new Set(['price', 'catalogPrice', 'matchScore']);
    private readonly textCollator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' });

    protected readonly PageStates = PageStates;
    protected readonly columnLabels: Record<string, string> = {
        name: 'שם',
        matchScore: 'התאמה',
        characterization: 'אפיון',
        enName: 'שם באנגלית',
        isNew: 'חדש',
        deal: 'מבצע',
        marketer: 'משווק',
        manufacturer: 'מגדל',
        brand: 'מותג',
        expiry: 'תוקף',
        price: 'מחיר',
        catalogPrice: 'מחיר קטלוג',
        parent1: 'הורה 1',
        parent2: 'הורה 2',
        originStrain: 'גנטיקה',
        countryOfOrigin: 'מקור',
        terpenes: 'טרפנים',
        packageType: 'אריזה',
        growType: 'גידול',
        thc: 'THC',
        cbd: 'CBD',
    };
    private readonly preferredColumns = [
        'name',
        'matchScore',
        'characterization',
        'price',
        'originStrain',
        'marketer',
        'countryOfOrigin',
        'expiry',
        'packageType',
    ];
    private readonly embeddedColumns = [
        'id',
        'enName',
        'deal',
        'rating',
        'isNew',
        'catalogPrice',
        'terpenes',
        'parent1',
        'parent2',
        'manufacturer',
        'brand',
        'symbols',
        'imageUrl',
        'productUrl',
        'category',
        'family',
        'growType',
        'thc',
        'cbd',
        'score',
        'penalty',
        'penaltyIngredient',
        'breakdown'
    ];

    rawItems = signal<any[]>([]);
    loading = signal(true);
    error = signal<string | null>(null);
    selectedImageUrl = signal<string | null>(null);
    imageDialogVisible = signal(false);
    matchDrawerVisible = signal(false);
    readonly tooltip = signal<TooltipPos | null>(null);
    readonly activeScoreTooltip = signal<ScoreTooltipPos | null>(null);
    private readonly tooltipTimeout = signal<ReturnType<typeof setTimeout> | null>(null);
    private readonly scoreTooltipTimeout = signal<ReturnType<typeof setTimeout> | null>(null);

    activeFilters = signal<StrainHunterFilter[]>([]);
    activeSortField = signal<string | null>(null);

    items = computed<StrainRow[]>(() => {
        const raw = this.rawItems();
        const filters = this.activeFilters();

        const filtered = filters.length === 0
            ? raw
            : raw.filter((item) => {
                return filters.every((filter) => {
                    const val = filter.value.toLowerCase();
                    return filter.fields.some((field) => {
                        return this.formatValue(item[field]).toLowerCase().includes(val);
                    });
                });
            });

        return filtered.map((item) => this.matchingEngine.calculateScore(item));
    });

    pageState = computed<PageStates>(() => {
        if (this.loading()) {
            return PageStates.Loading;
        }
        if (this.error()) {
            return PageStates.Error;
        }
        return this.items().length > 0 ? PageStates.Ready : PageStates.Empty;
    });

    columns = computed(() => {
        const knownAlways = ['name'];
        if (this.matchingEngine.hasAnyPreference()) {
            knownAlways.push('matchScore');
        }

        const keys = new Set<string>(knownAlways);
        this.rawItems().forEach((item) => {
            Object.keys(item).forEach((key) => {
                keys.add(key);
            });
        });

        const knownColumns = this.preferredColumns.filter((key) => {
            return key === 'matchScore' || keys.has(key);
        });
        const extraColumns = Array.from(keys).filter((key) => {
            return !this.preferredColumns.includes(key) && !this.embeddedColumns.includes(key) && key !== 'id' && key !== 'name';
        });

        return [...knownColumns, ...extraColumns];
    });

    searchColumns = computed(() => {
        const columns = new Set([...this.columns(), ...this.embeddedColumns]);
        return Array.from(columns);
    });

    ngOnInit() {
        this.terpeneStore.loadAll();
        this.geneticsStore.loadAll();
        this.load(false);
    }

    load(forceRefresh = false) {
        this.requestSubscription?.unsubscribe();
        this.loading.set(true);
        this.error.set(null);

        const url = forceRefresh ? `${this.base}/fetch?forceRefresh=true` : `${this.base}/fetch`;

        this.requestSubscription = this.http
            .get<StrainHunterResponse>(url)
            .pipe(timeout(45000))
            .subscribe({
                next: (response) => {
                    this.rawItems.set(response.items ?? []);
                    this.loading.set(false);
                },
                error: (error: unknown) => {
                    this.rawItems.set([]);
                    this.error.set(this.getErrorMessage(error));
                    this.loading.set(false);
                },
            });
    }

    refresh() {
        this.load(true);
    }

    openMatchDrawer() {
        this.matchDrawerVisible.set(true);
    }

    closeMatchDrawer() {
        this.matchDrawerVisible.set(false);
    }

    ringCircumference = 2 * Math.PI * 18;

    ringDashOffset(score: number): number {
        return (1 - Math.max(0, Math.min(100, score)) / 100) * this.ringCircumference;
    }

    ringColorClass(score: number): string {
        if (score >= 75) return 'ring-success';
        if (score >= 50) return 'ring-primary';
        if (score >= 25) return 'ring-warning';
        return 'ring-danger';
    }

    applyDataFilter(fields: StrainHunterFilterField | StrainHunterFilterField[], value: unknown, label?: string) {
        const filterValue = this.formatValue(value);
        if (!filterValue) {
            return;
        }

        const filterLabel = label ?? filterValue;
        const filterFields = Array.isArray(fields) ? fields : [fields];
        const key = `${filterFields.join('|')}:${filterValue.toLowerCase()}`;

        this.activeFilters.update((prev) => {
            if (prev.some((filter) => {
                return filter.key === key;
            })) {
                return prev.filter((filter) => {
                    return filter.key !== key;
                });
            }

            return [...prev, { key, fields: filterFields, label: filterLabel, value: filterValue }];
        });
    }

    removeFilter(key: string) {
        this.activeFilters.update((prev) => {
            return prev.filter((filter) => {
                return filter.key !== key;
            });
        });
    }

    clearAllFilters() {
        this.activeFilters.set([]);
    }

    openImageDialog(imageUrl: string) {
        this.selectedImageUrl.set(imageUrl);
        this.imageDialogVisible.set(true);
    }

    closeImageDialog() {
        this.imageDialogVisible.set(false);
        this.selectedImageUrl.set(null);
    }

    onTerpeneEnter(name: string, event: MouseEvent) {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const top = rect.bottom + TOOLTIP_GAP;
        const chipCenter = rect.left + rect.width / 2;
        const left = Math.max(TOOLTIP_GAP, Math.min(chipCenter - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - TOOLTIP_GAP));

        const timeout = setTimeout(() => {
            this.tooltip.set({ name, category: 'terpene', top, left });
            this.tooltipTimeout.set(null);
        }, TOOLTIP_DELAY_MS);
        this.tooltipTimeout.set(timeout);
    }

    onGeneticsEnter(name: string, event: MouseEvent) {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const top = rect.bottom + TOOLTIP_GAP;
        const chipCenter = rect.left + rect.width / 2;
        const left = Math.max(TOOLTIP_GAP, Math.min(chipCenter - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - TOOLTIP_GAP));

        const timeout = setTimeout(() => {
            this.tooltip.set({ name, category: 'genetics', top, left });
            this.tooltipTimeout.set(null);
        }, TOOLTIP_DELAY_MS);
        this.tooltipTimeout.set(timeout);
    }

    onTooltipLeave() {
        const timeout = this.tooltipTimeout();
        if (timeout) {
            clearTimeout(timeout);
            this.tooltipTimeout.set(null);
        }
        this.tooltip.set(null);
    }

    onScoreRingEnter(breakdown: ScoreBreakdown, event: MouseEvent) {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();

        const top = rect.bottom + TOOLTIP_GAP;
        const targetWidth = 260; // Approx score tooltip max width from layout
        const chipCenter = rect.left + rect.width / 2;
        const left = Math.max(TOOLTIP_GAP, Math.min(chipCenter - targetWidth / 2, window.innerWidth - targetWidth - TOOLTIP_GAP));

        const timeout = setTimeout(() => {
            this.activeScoreTooltip.set({ breakdown, top, left });
            this.scoreTooltipTimeout.set(null);
        }, TOOLTIP_DELAY_MS);
        this.scoreTooltipTimeout.set(timeout);
    }

    onScoreRingLeave() {
        const timeout = this.scoreTooltipTimeout();
        if (timeout) {
            clearTimeout(timeout);
            this.scoreTooltipTimeout.set(null);
        }
        this.activeScoreTooltip.set(null);
    }

    applyGlobalFilter(event: Event) {
        this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    sortTable(event: SortEvent): void {
        if (!event.data || !event.field) {
            return;
        }

        const field = this.resolveSortField(event.field);
        const order = event.order ?? 1;

        this.activeSortField.set(field);

        event.data.sort((first, second) => {
            return this.compareSortValues(first?.[field], second?.[field], field) * order;
        });
    }

    columnLabel(column: string): string {
        return this.columnLabels[column] ?? column;
    }

    formatValue(value: unknown): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        if (typeof value === 'boolean') {
            return value ? 'כן' : 'לא';
        }
        if (value instanceof Date) {
            return value.toLocaleString();
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    hasDisplayValue(value: unknown): boolean {
        return this.formatValue(value) !== '';
    }

    packageTypeIconClass(value: unknown): string {
        const packageType = this.formatValue(value);
        if (packageType.includes('צנצנת')) {
            return 'ph-jar-label';
        }
        if (packageType.includes('שקית')) {
            return 'ph-bag-simple';
        }
        return 'ph-question-mark';
    }

    splitTerpenes(value: unknown): TerpeneFilter[] {
        const terpenes = this.formatValue(value);
        if (!terpenes || terpenes === 'לא ידוע') {
            return [];
        }

        return terpenes
            .split(',')
            .map((terpene) => {
                return this.toTerpeneFilter(terpene);
            })
            .filter((terpene): terpene is TerpeneFilter => {
                return terpene !== null;
            });
    }

    countryFlagUrl(value: unknown): string {
        const country = this.formatValue(value);
        const flags: Record<string, string> = {
            'ישראל': 'il',
            'קנדה': 'ca',
            'פורטוגל': 'pt',
            'אורוגוואי': 'uy',
            'אוגנדה': 'ug',
            'ספרד': 'es',
            'גרמניה': 'de',
            'מרוקו': 'ma',
            'דנמרק': 'dk',
            'הולנד': 'nl',
        };

        const code = flags[country];
        return code ? `/flags/${code}.svg` : '';
    }

    getSymbols(symbols: unknown): { url: string; alt: string }[] {
        let parsedSymbols = symbols;

        if (typeof symbols === 'string') {
            try {
                parsedSymbols = JSON.parse(symbols);
            } catch {
                return [];
            }
        }

        if (!Array.isArray(parsedSymbols)) {
            return [];
        }

        return parsedSymbols
            .map((sym) => {
                if (!sym || typeof sym !== 'object') {
                    return undefined;
                }

                const rawUrl = typeof sym.url === 'string' ? sym.url : '';
                const alt = typeof sym.alt === 'string' ? sym.alt : '';

                if (!rawUrl) {
                    return undefined;
                }

                const lowerUrl = rawUrl.toLowerCase();
                let finalUrl = rawUrl;

                if (lowerUrl.includes('pest-free')) {
                    finalUrl = 'assets/images/pest-free.png';
                } else if (lowerUrl.includes('beta-radiation')) {
                    finalUrl = 'assets/images/beta-radiation.png';
                }

                return { url: finalUrl, alt };
            })
            .filter((sym): sym is { url: string; alt: string } => {
                return sym !== undefined;
            });
    }

    formatFamilyHebrew(family: string): string {
        const lower = family.toLowerCase();
        if (lower.includes('indica')) {
            return 'אינדיקה';
        }
        if (lower.includes('sativa')) {
            return 'סאטיבה';
        }
        if (lower.includes('hybrid') || lower.includes('היבריד') || lower.includes('הייבריד')) {
            return 'היבריד';
        }
        return family;
    }

    getFamilyClass(family: string): string {
        const lower = family.toLowerCase();
        if (lower.includes('indica')) {
            return 'family-indica';
        }
        if (lower.includes('sativa')) {
            return 'family-sativa';
        }
        if (lower.includes('hybrid')) {
            return 'family-hybrid';
        }
        return '';
    }

    isSortingByScore(): boolean {
        return this.activeSortField() === 'score';
    }

    isGeneticsLiked(name: string): boolean {
        const state = this.matchingEngine.prefState(`genetics:${name.trim()}`);
        return state === 'like' || state === 'love';
    }

    isTerpeneLiked(name: string): boolean {
        const state = this.matchingEngine.prefState(`terpene:${name}`);
        return state === 'like' || state === 'love';
    }

    geneticsClass(name: string): string {
        return this.isSortingByScore() && this.isGeneticsLiked(name) ? 'filter-node liked' : 'filter-node';
    }

    terpeneClass(name: string): string {
        return this.isSortingByScore() && this.isTerpeneLiked(name) ? 'terpene-node filter-node liked' : 'terpene-node filter-node';
    }

    private toTerpeneFilter(value: string): TerpeneFilter | null {
        const label = value.trim();
        if (!label) {
            return null;
        }

        const name = label
            .replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?\s*$/u, '')
            .replace(/\s*\(?%\s*\d+(?:[.,]\d+)?\)?\s*$/u, '')
            .trim();

        return { label, name: name || label };
    }

    private compareSortValues(first: unknown, second: unknown, field: string): number {
        const firstValue = this.sortValue(first, field);
        const secondValue = this.sortValue(second, field);

        if (firstValue === null && secondValue === null) {
            return 0;
        }
        if (firstValue === null) {
            return 1;
        }
        if (secondValue === null) {
            return -1;
        }

        if (typeof firstValue === 'number' && typeof secondValue === 'number') {
            return firstValue - secondValue;
        }

        return this.textCollator.compare(String(firstValue), String(secondValue));
    }

    private sortValue(value: unknown, field: string): number | string | null {
        const formattedValue = this.formatValue(value);
        if (!formattedValue) {
            return null;
        }

        if (this.numericSortColumns.has(field)) {
            return this.toNumber(formattedValue);
        }

        return formattedValue;
    }

    private resolveSortField(columnField: string): string {
        return columnField === 'matchScore' ? 'score' : columnField;
    }

    private toNumber(value: string): number | null {
        const normalized = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        const numberValue = Number(normalized);

        return Number.isFinite(numberValue) ? numberValue : null;
    }

    private getErrorMessage(error: unknown): string {
        if (!(error instanceof HttpErrorResponse)) {
            return 'טעינת נתוני הזנים נמשכת יותר מדי זמן. נסה שוב בעוד רגע.';
        }

        const serverMessage =
            typeof error.error?.message === 'string'
                ? error.error.message
                : typeof error.error === 'string'
                    ? error.error
                    : '';

        return serverMessage || 'טעינת נתוני הזנים נכשלה.';
    }
}