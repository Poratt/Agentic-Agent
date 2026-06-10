import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Subscription, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageStates } from '../../core/enums/page-states.enum';
import { mockData } from './mock';

type ExplorerResponse = {
  items: Record<string, unknown>[];
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
    originStrain: 'זן מקור',
    countryOfOrigin: 'ארץ ייצור',
    terpenes: 'טרפנים',
    packageType: 'סוג אריזה',
  };
  private readonly preferredColumns = [
    'name',
    'price',
    'marketer',
    'expiry',
    'originStrain',
    'countryOfOrigin',
    'packageType',
  ];
  private readonly embeddedColumns = ['enName', 'deal', 'rating', 'isNew', 'catalogPrice', 'terpenes', 'parent1', 'parent2', 'manufacturer', 'brand'];

  rawItems = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  activeFilters = signal<string[]>([]);
  strainFilter = signal('originStrain');

  items = computed(() => {
    const raw = this.rawItems();
    const filters = this.activeFilters();

    if (filters.length === 0) {
      return raw;
    }

    return raw.filter((item) => {
      return filters.every((filterVal) => {
        const val = filterVal.toLowerCase();
        const origin = String(item.originStrain || '').toLowerCase();
        const p1 = String(item.parent1 || '').toLowerCase();
        const p2 = String(item.parent2 || '').toLowerCase();

        return origin.includes(val) || p1.includes(val) || p2.includes(val);
      });
    });
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

  applyStrainFilter(filterBy: 'originStrain' | 'parent', value: string) {
    if (!value) return;

    if (this.activeFilters().includes(value)) {
      return;
    }

    this.strainFilter.set(filterBy);
    this.activeFilters.update((prev) => [...prev, value]);
  }

  removeFilter(value: string) {
    this.activeFilters.update((prev) => prev.filter((f) => f !== value));
  }

  clearAllFilters() {
    this.activeFilters.set([]);
  }

  applyGlobalFilter(event: Event) {
    this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
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