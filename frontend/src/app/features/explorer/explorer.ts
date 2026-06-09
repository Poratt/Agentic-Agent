import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { Subscription, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageStates } from '../../core/enums/page-states.enum';

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
    'manufacturer',
    'brand',
    'expiry',
    'originStrain',
    'parent1',
    'parent2',
    'countryOfOrigin',
    'terpenes',
    'packageType',
  ];
  private readonly embeddedColumns = ['enName', 'deal', 'rating', 'isNew', 'catalogPrice'];

  // items = signal<Record<string, unknown>[]>([]);
  items = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  pageState = computed<PageStates>(() => {
    if (this.loading()) return PageStates.Loading;
    if (this.error()) return PageStates.Error;
    return this.items().length > 0 ? PageStates.Ready : PageStates.Empty;
  });

  columns = computed(() => {
    const keys = new Set<string>();
    this.items().forEach((item) => {
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
    // this.load();
    console.log(mockData);
    this.items.set(mockData);
    this.loading.set(false);
  }

  load() {
    this.requestSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.requestSubscription = this.http.get<ExplorerResponse>(`${this.base}/fetch`).pipe(timeout(45000)).subscribe({
      next: (response) => {
        this.items.set(response.items ?? []);
        console.log(this.items());
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.items.set([]);
        this.error.set(this.getErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  applyGlobalFilter(event: Event) {
    this.table()?.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  columnLabel(column: string): string {
    return this.columnLabels[column] ?? column;
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  hasDisplayValue(value: unknown): boolean {
    return this.formatValue(value) !== '-' && this.formatValue(value) !== 'לא צוין';
  }

  packageTypeIconClass(value: unknown): string {
    const packageType = this.formatValue(value);

    if (packageType.includes('צנצנת')) return 'ph-jar-label';
    if (packageType.includes('שקית')) return 'ph-bag-simple';

    return 'ph-package';
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



const mockData = [
  {
    name: "ראיין",
    enName: "Rhine",
    isNew: true,
    rating: "(0)3",
    deal: "3 ב-₪279",
    manufacturer: "קנאפארמה",
    brand: "לומה",
    expiry: "12/26",
    price: "₪99",
    catalogPrice: "₪199",
    parent1: "סקאנק #1",
    parent2: "אפגני",
    originStrain: "אוג'י צ'יז",
    countryOfOrigin: "קנדה",
    terpenes: "לא ידוע",
    packageType: "שקית"
  },
  {
    name: "ואנקה",
    enName: "Wanaka",
    isNew: false,
    rating: "(9)3",
    deal: "3 ב-₪299",
    manufacturer: "קנערבה",
    brand: "טא-מוקו",
    expiry: "11/27",
    price: "₪109",
    catalogPrice: "₪199",
    parent1: "פלורידה אוג'י",
    parent2: "אפגני",
    originStrain: "ספאייר אוג'י",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "צנצנת"
  },
  {
    name: "ראנגי",
    enName: "Rangi",
    isNew: false,
    rating: "(1)3",
    deal: "3 ב-₪299",
    manufacturer: "קנערבה",
    brand: "טא-מוקו",
    expiry: "11/27",
    price: "₪109",
    catalogPrice: "₪199",
    parent1: "סטארדוג גויאבה",
    parent2: "אוג'י קוש",
    originStrain: "לא צוין",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "צנצנת"
  },
  {
    name: "אור ג'י.בי סמול",
    enName: "Or G.B Small",
    isNew: false,
    rating: "(2)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "01/27",
    price: "₪129",
    catalogPrice: "₪199",
    parent1: "גלוברי",
    parent2: "אוג'י קוש",
    originStrain: "גלוברי או ג'י",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "אר.אס.סי",
    enName: "R.S.C",
    isNew: false,
    rating: "(1)",
    deal: "לא צוין",
    manufacturer: "קנאדו",
    brand: "קנאדו",
    expiry: "12/26",
    price: "₪129",
    catalogPrice: "₪399",
    parent1: "ריינבו שרבט",
    parent2: "קאפ ג'אנקי",
    originStrain: "לא צוין",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "גר.ליקס",
    enName: "Gar.Lix",
    isNew: false,
    rating: "(1)",
    deal: "לא צוין",
    manufacturer: "קנאדו",
    brand: "קנאדו",
    expiry: "07/26",
    price: "₪129",
    catalogPrice: "₪349",
    parent1: "גרליק ברת' 2.0",
    parent2: "דיזיינר ראנטז",
    originStrain: "גלייזד גרליק",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "סלאק מיני",
    enName: "Slac Mini",
    isNew: true,
    rating: "(0)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "03/27",
    price: "₪129",
    catalogPrice: "₪329",
    parent1: "אוג'י קוש ברת'",
    parent2: "גויאבה ג'לאטו",
    originStrain: "קריביאן קוקיז",
    countryOfOrigin: "ישראל",
    terpenes: "לינאלול, קריופילן, מירצן, לימונן, פיינן",
    packageType: "לא צוין"
  },
  {
    name: "דאבליו.אם.זד סמול",
    enName: "W.M.Z Small",
    isNew: true,
    rating: "(2)",
    deal: "לא צוין",
    manufacturer: "אוונט",
    brand: "אוונט",
    expiry: "12/26",
    price: "₪135",
    catalogPrice: "₪269",
    parent1: "ווטרמלון",
    parent2: "סקיטלז",
    originStrain: "ווטרמלון סקיטלז",
    countryOfOrigin: "קנדה",
    terpenes: "יומולן, קריופילן, מירצן, פיינן, לימונן",
    packageType: "לא צוין"
  },
  {
    name: "אור ג'י.בי",
    enName: "Or G.B",
    isNew: false,
    rating: "(2)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "01/27",
    price: "₪149",
    catalogPrice: "₪329",
    parent1: "גלוברי",
    parent2: "אוג'י קוש",
    originStrain: "גלוברי או ג'י",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "איי.וי.ג'י-אס",
    enName: "A.V.G-S",
    isNew: false,
    rating: "(2)",
    deal: "לא צוין",
    manufacturer: "אוונט",
    brand: "אוונט",
    expiry: "11/26",
    price: "₪149",
    catalogPrice: "₪349",
    parent1: "סקיטלז",
    parent2: "אפלז אנד בננז",
    originStrain: "אייוי גז",
    countryOfOrigin: "קנדה",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "סלאק",
    enName: "Slac",
    isNew: false,
    rating: "(3)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "02/27",
    price: "₪149",
    catalogPrice: "₪399",
    parent1: "אוג'י קוש ברת'",
    parent2: "גויאבה ג'לאטו",
    originStrain: "קריביאן קוקיז",
    countryOfOrigin: "ישראל",
    terpenes: "לינאלול, קריופילן, מירצן, לימונן, פיינן",
    packageType: "לא צוין"
  },
  {
    name: "פלורו",
    enName: "Floro",
    isNew: true,
    rating: "(1)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "04/27",
    price: "₪149",
    catalogPrice: "₪219",
    parent1: "בננה אוג'י קוש",
    parent2: "סורבה",
    originStrain: "בננה סורבה",
    countryOfOrigin: "קנדה",
    terpenes: "מירצן, לימונן, קריופילן",
    packageType: "לא צוין"
  },
  {
    name: "גנגס",
    enName: "Ganges",
    isNew: false,
    rating: "(1)3",
    deal: "3 ב-₪449",
    manufacturer: "לא ידוע",
    brand: "קנאוורו",
    expiry: "09/26",
    price: "₪159",
    catalogPrice: "₪329",
    parent1: "דולצ'ה דה אווה",
    parent2: "שרבאנגר",
    originStrain: "בלאק מייפל",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "אסטרו אף.סי.די",
    enName: "Astro F.C.D",
    isNew: true,
    rating: "(4)",
    deal: "לא צוין",
    manufacturer: "סיקסטי סבן סינס",
    brand: "אסטרו",
    expiry: "03/27",
    price: "₪169",
    catalogPrice: "₪199",
    parent1: "איי קנדי",
    parent2: "אפלז אנד בננז",
    originStrain: "פאסאד",
    countryOfOrigin: "קנדה",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "ג'י.אר.אל.זי",
    enName: "G.R.L.Z",
    isNew: false,
    rating: "(4)",
    deal: "לא צוין",
    manufacturer: "סי3",
    brand: "טוגדר",
    expiry: "02/27",
    price: "₪169",
    catalogPrice: "₪209",
    parent1: "ג'י אם או",
    parent2: "סקיטלז",
    originStrain: "גרליק סקיטלז",
    countryOfOrigin: "קנדה",
    terpenes: "לא ידוע",
    packageType: "לא צוין"
  },
  {
    name: "ג'י.פי.טי סמול",
    enName: "G.P.T Small",
    isNew: false,
    rating: "(4)",
    deal: "לא צוין",
    manufacturer: "סי3",
    brand: "טוגדר",
    expiry: "02/27",
    price: "₪169",
    catalogPrice: "₪269",
    parent1: "סטרוברי בננה",
    parent2: "פרויו",
    originStrain: "סטרוברי פרויו",
    countryOfOrigin: "קנדה",
    terpenes: "מירצן 33%, פיינן 28%, אוסימן 16%, אחרים 23%",
    packageType: "לא צוין"
  },
  {
    name: "קאטה",
    enName: "Kata",
    isNew: true,
    rating: "(1)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "01/27",
    price: "₪169",
    catalogPrice: "₪199",
    parent1: "פיור מישיגן",
    parent2: "ראנטז",
    originStrain: "קאדילק ריינבו",
    countryOfOrigin: "ישראל",
    terpenes: "מירצן, קריופילן",
    packageType: "לא צוין"
  },
  {
    name: "בי.סי.אר",
    enName: "B.C.R",
    isNew: false,
    rating: "(3)",
    deal: "לא צוין",
    manufacturer: "דיקאר",
    brand: "ג'יי אר סטריין",
    expiry: "11/26",
    price: "₪175",
    catalogPrice: "₪349",
    parent1: "בננה אוג'י קוש",
    parent2: "קוקיז אנד קרים",
    originStrain: "בננה קרים",
    countryOfOrigin: "קנדה",
    terpenes: "לינאלול, מירצן, פיינן",
    packageType: "לא צוין"
  },
  {
    name: "רוקס אם פי מיני",
    enName: "Rox MP Mini",
    isNew: true,
    rating: "(0)",
    deal: "לא צוין",
    manufacturer: "רוקסטון",
    brand: "רוקסטון",
    expiry: "04/27",
    price: "₪175",
    catalogPrice: "₪349",
    parent1: "לא צוין",
    parent2: "לא צוין",
    originStrain: "לא צוין",
    countryOfOrigin: "קנדה",
    terpenes: "לא צוין",
    packageType: "לא צוין"
  },
  {
    name: "ג'י.פי.איי.אי מיני",
    enName: "G.P.I.E Mini",
    isNew: true,
    rating: "(2)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "טוגדר",
    expiry: "02/27",
    price: "₪179",
    catalogPrice: "₪329",
    parent1: "ג'לאטי",
    parent2: "קוש מינטס",
    originStrain: "ג'ורג'יה פאי",
    countryOfOrigin: "קנדה",
    terpenes: "לינאלול, קריופילן, מירצן, לימונן, פיינן",
    packageType: "לא צוין"
  },
  {
    name: "דון-בי",
    enName: "Don-B",
    isNew: false,
    rating: "(2)3",
    deal: "3 ב-₪525",
    manufacturer: "לא ידוע",
    brand: "שיח",
    expiry: "02/27",
    price: "₪179",
    catalogPrice: "₪229",
    parent1: "גריז מאנקי",
    parent2: "טריפל אוג'י",
    originStrain: "דונקי באטר",
    countryOfOrigin: "קנדה",
    terpenes: "לימונן 26%, קריופילן 24%, פיינן 15%, לינאלול 11%, יומולן 8%, אחרים 16%",
    packageType: "לא צוין"
  },
  {
    name: "לאסק",
    enName: "Lask",
    isNew: false,
    rating: "(2)3",
    deal: "3 ב-₪525",
    manufacturer: "לא ידוע",
    brand: "שיח",
    expiry: "11/26",
    price: "₪179",
    catalogPrice: "₪229",
    parent1: "קרים",
    parent2: "אל.איי קוש קייק",
    originStrain: "קרים קייק",
    countryOfOrigin: "קנדה",
    terpenes: "קריופילן 35%, פרנסן 18%, מירצן 13%, לימונן 9%, יומולן 8%, לינאלול 7%, ביסבולול 4%, אחרים 6%",
    packageType: "לא צוין"
  },
  {
    name: "טיימס",
    enName: "Thames",
    isNew: true,
    rating: "(0)3",
    deal: "3 ב-₪525",
    manufacturer: "לא ידוע",
    brand: "קנאוורו",
    expiry: "12/26",
    price: "₪189",
    catalogPrice: "₪249",
    parent1: "אוראוז",
    parent2: "סופר בוף",
    originStrain: "סאב זירו",
    countryOfOrigin: "ישראל",
    terpenes: "לא ידוע",
    packageType: "שקית"
  },
  {
    name: "אורזקי מיני",
    enName: "Orzki Mini",
    isNew: false,
    rating: "(1)",
    deal: "לא צוין",
    manufacturer: "לא ידוע",
    brand: "שיח",
    expiry: "10/26",
    price: "₪199",
    catalogPrice: "₪269",
    parent1: "אנימל מינטס",
    parent2: "אורנג' סקיטלז",
    originStrain: "מנגו מינט",
    countryOfOrigin: "קנדה",
    terpenes: "לימונן 24%, קריופילן 17%, לינאלול 11%, פנצ'ול 7%, פרנסן 6%, טרפינאול 5.5%, יומולן 5.5%, מירצן 5%, אחרים 19%",
    packageType: "לא צוין"
  },
  {
    name: "אסטרו קאפ",
    enName: "Astro Cap",
    isNew: false,
    rating: "(22)",
    deal: "לא צוין",
    manufacturer: "סיקסטי סבן סינס",
    brand: "אסטרו",
    expiry: "11/26",
    price: "₪199",
    catalogPrice: "₪299",
    parent1: "קוש מינטס",
    parent2: "אליאן קוקיז",
    originStrain: "קאפ ג'אנקי",
    countryOfOrigin: "קנדה",
    terpenes: "לימונן 43%, קריופילן 31%, לינאלול 9%, אחרים 17%",
    packageType: "לא צוין"
  }
]
