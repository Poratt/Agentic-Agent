# Strain Hunter — Dynamic Pharm Scraping & Per-Pharm Price Columns

## Problem

`backend/src/modules/strain-hunter/strain-hunter.service.ts` declares
`favoritePharm` (`strain-hunter.service.ts:9-22`) and a per-pharm
`JANE_PRODUCTS_API_PATH` constant (`:23`), but the actual scraping is
hardcoded to `tiltan` — the second entry (`sup-osishkin`) is dead data.

The user wants:

1. The scraper to actually iterate over `favoritePharm` (currently
   `tiltan` + `sup-osishkin`).
2. The frontend `strain-hunter.html` to show one price column per
   entry in `favoritePharm`.
3. Strains that exist in more than one pharmacy to share a single row;
   strains that exist in only one pharmacy to leave the other cells
   empty.
4. No duplicate strain rows.

## Goal

Make `favoritePharm` actually drive the scraper, and reshape the API +
frontend so the table renders one column per pharmacy with merged
strain rows.

## Non-Goals

Explicitly excluded (per user feedback — bring back as a separate
request if/when needed):

- No `Pharm` entity, no migration, no CRUD controller.
- No settings tab for adding/removing pharms.
- No `pharmId` FK on `Strain` — use a plain `pharmQuery: string`
  column if a column is needed at all.
- No sticky columns, no per-pharm sort logic, no per-pharm filter
  chips, no per-pharm brand color.
- No fuzzy / similarity matching across pharmacies — exact match on
  normalized `enName`, with `name` (Hebrew) as fallback.
- No changes to the Jane scraping internals
  (`fetchDataFromUrl`, `extractProductRow`, `normalizeJaneProduct`).
  The current asc/desc dual-scrape for data completeness is preserved
  per pharm.

## API Shape (Breaking Change)

The frontend needs to know which pharms to render columns for. We
add a single field to the existing `StrainHunterFetchResponseDto`
rather than introducing a new endpoint:

```typescript
{
  pharms: { query: string; name: string }[];   // NEW — same order as favoritePharm
  items: {
    // shared strain fields (unchanged):
    name: string; enName: string; isNew: boolean; rating: string;
    deal: string; marketer: string; manufacturer: string; brand: string;
    expiry: string; parent1: string; parent2: string; originStrain: string;
    countryOfOrigin: string; terpenes: string; packageType: string;
    symbols: { url: string; alt: string }[]; imageUrl: string;
    productUrl: string; category: string; family: string; growType: string;
    thc: string; cbd: string;
    // per-pharm price block (NEW, replaces top-level price/catalogPrice):
    prices: {
      [pharmQuery: string]: {
        price: string;
        catalogPrice: string;
        productUrl: string;
        batch: string;
        lastScrapedAt: Date;
      } | null;
    };
  }[];
  lastScrapedAt: Date | null;
}
```

`pharms` is the same order as the `favoritePharm` array. The merge
key is `enName` (lowercased + trimmed) with `name` (lowercased +
trimmed) as fallback.

---

## Implementation — Single PR

### 1. Backend service refactor

**File:** `backend/src/modules/strain-hunter/strain-hunter.service.ts`

- **Delete** the file-level `JANE_PRODUCTS_API_PATH` constant and the
  hardcoded `SOURCE_URL_1` / `SOURCE_URL_2`. Keep the `favoritePharm`
  array exactly as-is at `strain-hunter.service.ts:9-22`.
- **Add** a private URL builder:

  ```typescript
  private buildSourceUrl(query: string, sortDirection: 'asc' | 'desc'): string {
      const filters =
          'productProductType%5Ein%5Eflower%3B' +
          'productCategory%5Ein%5ET22%2FC4%3B' +
          'productFamily%5Ein%5Eindica';
      const sort = sortDirection === 'asc' ? '' : '-';
      return `https://jane.co.il/store/${query}/?filters=${filters}&sortBy=${sort}store_price`;
  }
  ```

- **Add** a private API-path builder:

  ```typescript
  private buildProductsApiPath(query: string): string {
      return `/api/widget/products/store/${query}/`;
  }
  ```

- **Refactor** `fetchDataFromUrl(url)` → `fetchDataFromPharm(query)`,
  which internally does the existing asc+desc dual-scrape using
  `buildSourceUrl`. The `JANE_PRODUCTS_API_PATH` reference inside
  `page.on('response', ...)` becomes the dynamically-built path.
- **Refactor** `fetchData(forceRefresh)`:
  1. `const pharms = this.favoritePharm;` (the const is read at call
     time, no new state).
  2. For each `pharm` in `pharms`, run the existing scraper and tag
     every scraped item with `pharmQuery: pharm.query`.
  3. After all pharms are scraped, replace the existing
     `mergedMap` block with a cross-pharm merge by `enNameKey` into
     the new response shape (see snippet below).
  4. `strainRepository.clear()` then `save` rows, one per
     `(strain, pharmQuery)`. Each row carries `pharmQuery` so we can
     rebuild the merged view on read.
- **Cross-pharm merge function:**

  ```typescript
  private mergeStrainsAcrossPharms(
      scrapedByPharm: Map<string, StrainItem[]>,
      pharms: { query: string; name: string }[],
      scrapedAt: Date,
  ): MergedStrain[] {
      const acc = new Map<string, MergedStrain>();
      const enNameKey = (item: StrainItem) => {
          const en = item.enName?.trim().toLowerCase();
          if (en) return `en:${en}`;
          const heb = item.name?.trim().toLowerCase();
          return heb ? `heb:${heb}` : `url:${item.productUrl}`;
      };
      for (const pharm of pharms) {
          const items = scrapedByPharm.get(pharm.query) ?? [];
          for (const item of items) {
              const key = enNameKey(item);
              const existing = acc.get(key);
              const priceEntry = {
                  price: item.price,
                  catalogPrice: item.catalogPrice,
                  productUrl: item.productUrl,
                  batch: item.batch,
                  lastScrapedAt: scrapedAt,
              };
              if (existing) {
                  existing.prices[pharm.query] = priceEntry;
              } else {
                  acc.set(key, {
                      name: item.name,
                      enName: item.enName,
                      isNew: item.isNew,
                      rating: item.rating,
                      deal: item.deal,
                      marketer: item.marketer,
                      manufacturer: item.manufacturer,
                      brand: item.brand,
                      expiry: item.expiry,
                      parent1: item.parent1,
                      parent2: item.parent2,
                      originStrain: item.originStrain,
                      countryOfOrigin: item.countryOfOrigin,
                      terpenes: item.terpenes,
                      packageType: item.packageType,
                      symbols: item.symbols,
                      imageUrl: item.imageUrl,
                      productUrl: item.productUrl,
                      category: item.category,
                      family: item.family,
                      growType: item.growType,
                      thc: item.thc,
                      cbd: item.cbd,
                      prices: { [pharm.query]: priceEntry },
                  });
              }
          }
      }
      return Array.from(acc.values());
  }
  ```

  Every shared field from `StrainItem` is copied explicitly. No
  `...item` spread, no `Object.assign` — the field list above
  matches `StrainItem` 1:1 minus the per-pharm fields (`price`,
  `catalogPrice`, `batch`, `lastScrapedAt`) which live in the
  `prices[pharmQuery]` entry instead. If a new field is added to
  `StrainItem` later, both this copy and the cache-path copy below
  must be updated; we'll catch that with a test (see Verification).

- **Cache path** (`!forceRefresh && count > 0`): same shape, but
  reads from the DB. The existing code already does
  `await this.strainRepository.find()` (one query, all rows) before
  any grouping. The merge step stays **in-memory** on top of that
  result — no extra query, no SQL `GROUP BY`, no JOIN.

  Concrete shape:

  ```typescript
  if (!forceRefresh) {
      const count = await this.strainRepository.count();
      if (count > 0) {
          const rows = await this.strainRepository.find();
          const acc = new Map<string, MergedStrain>();
          for (const row of rows) {
              const key = enNameKeyFromRow(row);  // same en→heb→url fallback
              const existing = acc.get(key);
              const priceEntry = {
                  price: row.price,
                  catalogPrice: row.catalogPrice,
                  productUrl: row.productUrl,
                  batch: row.batch,
                  lastScrapedAt: row.lastScrapedAt,
              };
              if (existing) {
                  existing.prices[row.pharmQuery] = priceEntry;
              } else {
                  acc.set(key, {
                      name: row.name,
                      enName: row.enName,
                      isNew: row.isNew,
                      rating: row.rating,
                      deal: row.deal,
                      marketer: row.marketer,
                      manufacturer: row.manufacturer,
                      brand: row.brand,
                      expiry: row.expiry,
                      parent1: row.parent1,
                      parent2: row.parent2,
                      originStrain: row.originStrain,
                      countryOfOrigin: row.countryOfOrigin,
                      terpenes: row.terpenes,
                      packageType: row.packageType,
                      symbols: row.symbols,
                      imageUrl: row.imageUrl,
                      productUrl: row.productUrl,
                      category: row.category,
                      family: row.family,
                      growType: row.growType,
                      thc: row.thc,
                      cbd: row.cbd,
                      prices: { [row.pharmQuery]: priceEntry },
                  });
              }
          }
          return { items: Array.from(acc.values()), lastScrapedAt: rows[0]?.lastScrapedAt ?? null };
      }
  }
  ```

  **Why this is fine at expected scale:** with 2-3 pharms and
  ~100-300 strains per pharm, the cache path returns 200-900 rows
  from one `find()` and groups them in memory. That's two DB
  roundtrips (`count` + `find`) and one O(n) pass. We are not
  adding a third query. If strain counts ever grow past ~5,000
  rows per pharm, the next step is a SQL-side grouping with a
  composite index on `(pharmQuery, enName)` — but that's a
  follow-up, not part of this plan.

### 2. `Strain` entity — minimal column add

**File:** `backend/src/modules/strain-hunter/entities/strain.ts`

```typescript
@Column({ type: 'varchar', length: 100, default: 'tiltan' })
pharmQuery!: string;
```

Default `'tiltan'` so the migration is just `ADD COLUMN pharmQuery
VARCHAR(100) NOT NULL DEFAULT 'tiltan'` — existing rows are
correctly backfilled. No FK, no CASCADE, no index required (the
read path groups in memory).

### 3. DTO update

**File:** `backend/src/modules/strain-hunter/dto/strain-hunter-fetch-response.dto.ts`

- Drop top-level `price` / `catalogPrice` from `StrainDto`.
- Add `StrainPriceDto` (`price`, `catalogPrice`, `productUrl`,
  `batch`, `lastScrapedAt`).
- Add `prices: Record<string, StrainPriceDto | null>` to `StrainDto`.
- Add `PharmRefDto` (`query`, `name`).
- Add `pharms: PharmRefDto[]` to `StrainHunterFetchResponseDto`.

### 4. Frontend — dynamic per-pharm price column

**File:** `frontend/src/app/features/strain-hunter/strain-hunter.ts`

- Update `StrainHunterResponse` type to include `pharms`.
- Add `pharms = signal<{ query: string; name: string }[]>([])`
  populated alongside `items` in `load()`.
- Replace the static `price` column with a computed
  `priceColumns = computed(() => pharms())` driven by the response.

**File:** `frontend/src/app/features/strain-hunter/strain-hunter.html`

- Remove the single `price` column header.
- Loop over `priceColumns()` to render one `<th>` per pharm, header
  text is `pharm.name`. Existing `columnLabel(column)` already
  handles unknown columns — extend it (or just inline the binding)
  so a `priceColumns[i]` column shows the Hebrew pharm name.
- In the body, loop over `priceColumns()` to render a `<td>` per
  pharm, showing `item.prices[pharm.query]?.price ?? '—'`. Each cell
  links to `item.prices[pharm.query]?.productUrl` in a new tab when
  present.

No other frontend changes. Sort, filter chips, sticky columns all
left alone.

---

## Verification

**Unit tests** (in `strain-hunter.service.spec.ts`):

```typescript
describe('mergeStrainsAcrossPharms', () => {
    it('merges two pharms by enName into one row with both prices', () => {
        const tiltan: StrainItem = { /* ...full fixture... */
            name: 'גורילה גלו', enName: 'Gorilla Glue', /* ...all other fields... */
            price: '₪99', catalogPrice: '₪199', batch: 'B1', productUrl: 'https://tiltan/g',
        };
        const sup: StrainItem = { /* ...same name+enName, different price + url... */
            name: 'גורילה גלו', enName: 'Gorilla Glue',
            price: '₪120', catalogPrice: '', batch: 'B2', productUrl: 'https://sup/g',
        };
        const result = service.mergeStrainsAcrossPharms(
            new Map([['tiltan', [tiltan]], ['sup-osishkin', [sup]]]),
            [{ query: 'tiltan', name: 'תלתן' }, { query: 'sup-osishkin', name: 'סופר-פארם אוסישקין' }],
            new Date('2026-07-17'),
        );
        expect(result).toHaveLength(1);
        expect(result[0].prices.tiltan?.price).toBe('₪99');
        expect(result[0].prices['sup-osishkin']?.price).toBe('₪120');
    });

    it('leaves the missing-pharm price as null when a strain only exists in one', () => {
        const tiltanOnly: StrainItem = { /* ... */ enName: 'OG Kush', name: 'OG קוש', price: '₪80' };
        const result = service.mergeStrainsAcrossPharms(
            new Map([['tiltan', [tiltanOnly]]]),
            [{ query: 'tiltan', name: 'תלתן' }, { query: 'sup-osishkin', name: 'סופר-פארם אוסישקין' }],
            new Date('2026-07-17'),
        );
        expect(result[0].prices.tiltan?.price).toBe('₪80');
        expect(result[0].prices['sup-osishkin']).toBeNull();
    });

    it('falls back to name when enName is empty', () => {
        // both rows have empty enName but matching Hebrew name
        // expect a single merged row
    });

    it('does not duplicate when pharm already has a row with the same enName', () => {
        // tiltan returns two items with the same enName (rare but possible)
        // expect one merged row, not two
    });
});
```

**Field-list sync test** (catches the `...copy shared fields...`
drift problem):

```typescript
it('copies every shared field from StrainItem — drift guard', () => {
    const fixture: StrainItem = { /* all fields populated, sentinel values */ };
    const [merged] = service.mergeStrainsAcrossPharms(
        new Map([['tiltan', [fixture]]]),
        [{ query: 'tiltan', name: 'תלתן' }],
        new Date(),
    );
    for (const key of Object.keys(fixture) as (keyof StrainItem)[]) {
        if (key === 'price' || key === 'catalogPrice' || key === 'batch') continue;
        expect(merged[key]).toBe(fixture[key]);
    }
    // and the per-pharm fields live under prices.tiltan
    expect(merged.prices.tiltan?.price).toBe(fixture.price);
    expect(merged.prices.tiltan?.catalogPrice).toBe(fixture.catalogPrice);
    expect(merged.prices.tiltan?.batch).toBe(fixture.batch);
});
```

If a new field is added to `StrainItem` and forgotten in the merge
copy, this test fails immediately.

**Builds:**

```bash
npm run build -w backend
npm run test -w backend
npx ng build
npx ng test --watch=false
```

**Manual:**

1. Open the strain-hunter page with `sup-osishkin` already in
   `favoritePharm`. Confirm two price columns render
   (`תלתן` and `סופר-פארם אוסישקין`).
2. Confirm a strain that exists in both pharms shows both prices
   on one row.
3. Confirm a strain that exists only in tiltan shows `—` in the
   sup-osishkin cell.
4. Force-refresh and confirm new rows have `pharmQuery` populated
   in the DB.

---

## Future Work (Out of Scope)

If/when wanted, separate requests for:

- `Pharm` entity + CRUD + settings tab to manage pharms from the UI.
- Per-pharm sort / filter chips.
- Sticky price columns.
- Per-pharm brand color.

## Open Questions

- **Hebrew name fallback matching.** If `enName` is empty in one
  pharm and non-empty in another, we won't merge them. Acceptable
  for v1; revisit if data shows real mismatches.
- **Default pharm is hardcoded in `favoritePharm`.** If you want to
  re-order or remove tiltan, edit the const directly. A UI for that
  is the future-work item above.
