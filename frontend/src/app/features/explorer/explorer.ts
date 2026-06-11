import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import type { SortEvent } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Subscription, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageStates } from '../../core/enums/page-states.enum';
import { mockData } from './mock';

type ExplorerResponse = {
  items: Record<string, unknown>[];
};

type ExplorerFilterField =
  | 'originStrain'
  | 'parent1'
  | 'parent2'
  | 'marketer'
  | 'manufacturer'
  | 'brand'
  | 'packageType'
  | 'countryOfOrigin'
  | 'terpenes'
  | 'isNew';

type ExplorerFilter = {
  key: string;
  fields: ExplorerFilterField[];
  label: string;
  value: string;
};

type TerpeneFilter = {
  name: string;
  label: string;
};

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule, TableModule, InputTextModule],
  templateUrl: './explorer.html',
  styleUrls: ['./explorer.css'],
})
export class Explorer implements OnInit {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/explorer`;
  private table = viewChild<Table>('table');
  private requestSubscription: Subscription | null = null;
  private readonly numericSortColumns = new Set(['price', 'catalogPrice']);
  private readonly textCollator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' });

  protected readonly PageStates = PageStates;
  protected readonly columnLabels: Record<string, string> = {
    name: 'שם',
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
  };
  private readonly preferredColumns = [
    'name',
    'price',
    'originStrain',
    'marketer',
    'countryOfOrigin',
    'expiry',
    'packageType',
  ];
  private readonly embeddedColumns = ['enName', 'deal', 'rating', 'isNew', 'catalogPrice', 'terpenes', 'parent1', 'parent2', 'manufacturer', 'brand'];

  rawItems = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  activeFilters = signal<ExplorerFilter[]>([]);

  items = computed<ExplorerFilterField[]>(() => {
    const raw = this.rawItems();
    const filters = this.activeFilters();

    if (filters.length === 0) {
      return raw;
    }

    return raw.filter((item) =>
      filters.every((filter) => {
        const val = filter.value.toLowerCase();

        return filter.fields.some((field) => this.formatValue(item[field]).toLowerCase().includes(val));
      }),
    );
  });

  pageState = computed<PageStates>(() => {
    if (this.loading()) return PageStates.Loading;
    if (this.error()) return PageStates.Error;
    return this.items().length > 0 ? PageStates.Ready : PageStates.Empty;
  });

  columns = computed(() => {
    const keys = new Set<string>();
    this.rawItems().forEach((item) => {
      Object.keys(item).forEach((key) => keys.add(key));
    });

    const knownColumns = this.preferredColumns.filter((key) => keys.has(key));
    const extraColumns = Array.from(keys).filter(
      (key) => !this.preferredColumns.includes(key) && !this.embeddedColumns.includes(key),
    );

    return [...knownColumns, ...extraColumns];
  });

  searchColumns = computed(() => {
    const columns = new Set([...this.columns(), ...this.embeddedColumns]);
    return Array.from(columns);
  });

  ngOnInit() {
    this.rawItems.set(mockData);
    this.loading.set(false);
    // this.load()
  }

  load() {
    this.requestSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.requestSubscription = this.http
      .get<ExplorerResponse>(`${this.base}/fetch`)
      .pipe(timeout(45000))
      .subscribe({
        next: (response) => {
          this.rawItems.set(response.items ?? []);
          console.log(this.rawItems());
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.rawItems.set([]);
          this.error.set(this.getErrorMessage(error));
          this.loading.set(false);
        },
      });
  }

  applyDataFilter(fields: ExplorerFilterField | ExplorerFilterField[], value: unknown, label?: string) {
    const filterValue = this.formatValue(value);
    if (!filterValue) return;

    const filterLabel = label ?? filterValue;
    const filterFields = Array.isArray(fields) ? fields : [fields];
    const key = `${filterFields.join('|')}:${filterValue.toLowerCase()}`;

    this.activeFilters.update((prev) => {
      if (prev.some((filter) => filter.key === key)) {
        return prev.filter((filter) => filter.key !== key);
      }

      return [...prev, { key, fields: filterFields, label: filterLabel, value: filterValue }];
    });
  }

  removeFilter(key: string) {
    this.activeFilters.update((prev) => prev.filter((filter) => filter.key !== key));
  }

  clearAllFilters() {
    this.activeFilters.set([]);
  }

  applyGlobalFilter(event: Event) {
    this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  sortTable(event: SortEvent): void {
    if (!event.data || !event.field) return;

    const field = event.field;
    const order = event.order ?? 1;

    event.data.sort((first, second) => {
      return this.compareSortValues(first?.[field], second?.[field], field) * order;
    });
  }

  columnLabel(column: string): string {
    return this.columnLabels[column] ?? column;
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  hasDisplayValue(value: unknown): boolean {
    return this.formatValue(value) !== '';
  }

  packageTypeIconClass(value: unknown): string {
    const packageType = this.formatValue(value);
    if (packageType.includes('צנצנת')) return 'ph-jar-label';
    if (packageType.includes('שקית')) return 'ph-bag-simple';
    return 'ph-question-mark';
  }

  splitTerpenes(value: unknown): TerpeneFilter[] {
    const terpenes = this.formatValue(value);
    if (!terpenes || terpenes === 'לא ידוע') return [];

    return terpenes
      .split(',')
      .map((terpene) => this.toTerpeneFilter(terpene))
      .filter((terpene): terpene is TerpeneFilter => terpene !== null);
  }

  countryFlagUrl(value: unknown): string {
    const country = this.formatValue(value);
    const flags: Record<string, string> = {
      ישראל: 'il',
      קנדה: 'ca',
      פורטוגל: 'pt',
      אורוגוואי: 'uy',
      אוגנדה: 'ug',
      ספרד: 'es',
      גרמניה: 'de',
      מרוקו: 'ma',
      דנמרק: 'dk',
      הולנד: 'nl',
    };

    const code = flags[country];
    return code ? `/flags/${code}.svg` : '';
  }

  private toTerpeneFilter(value: string): TerpeneFilter | null {
    const label = value.trim();
    if (!label) return null;

    const name = label
      .replace(/\s*\(?\d+(?:[.,]\d+)?\s*%\)?\s*$/u, '')
      .replace(/\s*\(?%\s*\d+(?:[.,]\d+)?\)?\s*$/u, '')
      .trim();

    return { label, name: name || label };
  }

  private compareSortValues(first: unknown, second: unknown, field: string): number {
    const firstValue = this.sortValue(first, field);
    const secondValue = this.sortValue(second, field);

    if (firstValue === null && secondValue === null) return 0;
    if (firstValue === null) return 1;
    if (secondValue === null) return -1;

    if (typeof firstValue === 'number' && typeof secondValue === 'number') {
      return firstValue - secondValue;
    }

    return this.textCollator.compare(String(firstValue), String(secondValue));
  }

  private sortValue(value: unknown, field: string): number | string | null {
    const formattedValue = this.formatValue(value);
    if (!formattedValue) return null;

    if (this.numericSortColumns.has(field)) {
      return this.toNumber(formattedValue);
    }

    return formattedValue;
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
