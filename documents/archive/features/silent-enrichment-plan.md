# Plan — Silent Proactive Genetics & Terpene Enrichment

> Tracking: feature plan — when `StrainHunterService.fetchData()` scrapes new items
> from Jane, it silently detects missing genetics/terpene names, calls the LLM to
> fill them, upserts to the DB, and returns. The frontend tooltip shows real data
> on first hover — zero user interaction required.

## 1. Background

The `StrainHunter` page shows a product table with genetics and terpene names
extracted from Jane. Hovering a name triggers a tooltip that looks up the name
in `GeneticsStore` / `TerpeneStore`. If the name isn't in the DB yet, the
tooltip shows "אין מידע זמין" — a dead end.

The original approach was an admin-only "fill missing data" button inside the
tooltip. A better approach: **proactive, silent, backend-driven**.

Every time `fetchData` runs (on page load or force-refresh), the backend
automatically:

1. Detects which genetics and terpene names from the scraped items are missing
   from the reference catalogs.
2. Calls the LLM **once per catalog** with all missing names.
3. Upserts the enriched records to the `genetics` and `terpenes` tables.
4. Returns the items to the frontend — the existing `loadAll()` calls in
   `ngOnInit` will pick up the new data automatically.

Result: the tooltip shows real data on the very first hover, without any
frontend state changes or admin involvement.

## 2. Goals

- Terpene and genetics tooltips show real data on first hover for any product
  scraped from Jane — even for brand-new strain names.
- Zero frontend changes required — the tooltip, stores, and `ngOnInit` are
  untouched.
- Idempotent: re-running `fetchData` never re-calls the LLM for a name that
  already has complete data in the DB.
- Batch LLM calls (all missing names in one request) — efficient and cheap.

## 3. Non-Goals

- No admin-only button in the tooltip. The TODO comment at line 33 of
  `tooltip.html` is deleted.
- No user-facing "enriching" spinner or status. The process is silent.
- No per-name debouncing or retry queue. The batch approach fires once per
  catalog per `fetchData` call.
- No change to the frontend `GeneticsStore` / `TerpeneStore` — no new methods
  added.

## 4. Architecture

```
StrainHunterService.fetchData(forceRefresh)
  │
  ├─ scrapeFromJane() → items[]
  │
  ├─ strainRepository.save(items)          ← always runs
  │
  ├─ extract unique genetics names from items
  │     originStrain, parent1, parent2  (skip empty / "לא ידוע")
  │
  ├─ extract unique terpene names from items
  │     terpenes field  (skip empty / "לא ידוע")
  │
  ├─ GeneticsService.enrichBatch(missingGeneticsNames)
  │     ├─ findGeneticsNotInDb(missingNames)
  │     ├─ if empty → skip
  │     ├─ buildBatchPrompt(missingGeneticsNames)
  │     ├─ LlmClientService.generateResponse(prompt)
  │     ├─ parse JSON: { genetics: [{ name, description, parent1, parent2, origin, type, color }, ...] }
  │     └─ geneticsRepository.save(all)  ← upsert (TypeORM save() handles insert-or-update)
  │
  ├─ TerpeneService.enrichBatch(missingTerpeneNames)
  │     ├─ findTerpenesNotInDb(missingNames)
  │     ├─ if empty → skip
  │     ├─ buildBatchPrompt(missingTerpeneNames)
  │     ├─ LlmClientService.generateResponse(prompt)
  │     ├─ parse JSON: { terpenes: [{ name, description, scent, effects, color }, ...] }
  │     └─ terpeneRepository.save(all)  ← upsert
  │
  └─ return { items }
```

### 4.1 Why upsert matters

`TypeORM Repository.save()` with a partial entity:
- **New name** → INSERT
- **Existing name, partial record** → UPDATE only the non-null fields the LLM
  returned, preserving any manually set or previously enriched fields.

This means if a name was already enriched once (even partially), the next
`fetchData` call will only fill in the still-null fields without overwriting.

### 4.2 Idempotency per `fetchData` call

Inside `enrichBatch`, the first step is `findMissingByNames(names[])`:
`SELECT name FROM genetics WHERE name IN (...)`. The LLM is only called for the
subset that truly doesn't exist in the DB. If all names are already present,
the method returns immediately.

### 4.3 LLM call count per `fetchData`

At most **2 LLM calls**: one for genetics batch, one for terpenes batch.
If all names are already in the DB → 0 calls.

## 5. Data Models

### 5.1 Genetics entity (existing)

```
Genetics {
  id: number (auto)
  name: string (unique)
  description: string | null
  parent1: string | null
  parent2: string | null
  origin: string | null
  type: string | null   ("היברידי" | "סאטיבה" | "אינדיקה")
  color: string         (hex, e.g. "#228B22")
}
```

### 5.2 Terpene entity (existing)

```
Terpene {
  id: number (auto)
  name: string (unique)
  description: string | null
  scent: string | null
  effects: string | null   (JSON array stored as string, or comma-joined)
  color: string            (hex)
}
```

## 6. New Files

### 6.1 `backend/src/modules/genetics/constants/genetics-enrich-prompts.constant.ts`

System prompt + user prompt template for genetics batch enrichment.

```ts
export const GENETICS_ENRICH_SYSTEM_PROMPT = `You are a cannabis strain encyclopedia assistant.
Your task is to enrich a reference catalog of cannabis genetics (strains).
Return ONLY valid JSON — no explanation, no preamble, no markdown code fences.

For each strain name provided, infer or look up:
- description: Hebrew description, 1-3 sentences, e.g. "זן חזק במיוחד שזכה במקומות ראשונים..."
- parent1: First genetic parent name in Hebrew or English, or "לא ידוע"
- parent2: Second genetic parent name in Hebrew or English, or "לא ידוע"
- origin: Country or region of origin in Hebrew, e.g. "ארה"ב", "הולנד", "לא ידוע"
- type: One of "היברידי", "סאטיבה", or "אינדיקה"
- color: A hex color that fits the strain's character (e.g. "#228B22" for green/gorilla strains, "#FF6B35" for orange/energetic strains)

Return format:
{
  "genetics": [
    { "name": "...", "description": "...", "parent1": "...", "parent2": "...", "origin": "...", "type": "...", "color": "..." },
    ...
  ]
}`;

export function buildGeneticsEnrichUserPrompt(names: string[]): string {
  return `Enrich the following cannabis strain names:\n${names.map(n => `- ${n}`).join('\n')}`;
}
```

### 6.2 `backend/src/modules/terpene/constants/terpene-enrich-prompts.constant.ts`

System prompt + user prompt template for terpene batch enrichment.

```ts
export const TERPENE_ENRICH_SYSTEM_PROMPT = `You are a cannabis terpene encyclopedia assistant.
Your task is to enrich a reference catalog of cannabis terpenes.
Return ONLY valid JSON — no explanation, no preamble, no markdown code fences.

For each terpene name provided, infer or look up:
- description: Hebrew description, 1-3 sentences, e.g. "הטרפן הנפוץ ביותר בקנאביס, מספק ריח הדיר וטעם ארצי..."
- scent: Aroma profile in Hebrew, e.g. "אדמה, פירות יער, פלפל"
- effects: Comma-separated list of 1-4 short Hebrew effect labels, e.g. "מרגיע, משכך כאבים, מעורר תיאבון"
- color: A hex color that fits the terpene's aromatic character (e.g. "#66BB6A" for citrus/sour, "#8D6E63" for earthy/wood)

Return format:
{
  "terpenes": [
    { "name": "...", "description": "...", "scent": "...", "effects": "...", "color": "..." },
    ...
  ]
}`;

export function buildTerpeneEnrichUserPrompt(names: string[]): string {
  return `Enrich the following cannabis terpene names:\n${names.map(n => `- ${n}`).join('\n')}`;
}
```

### 6.3 `backend/src/modules/genetics/dto/enrich-genetics.dto.ts`

```ts
import { ApiProperty } from '@nestjs/swagger';

export class EnrichGeneticsItemDto {
  @ApiProperty({ example: 'גורילה גלו' })
  name!: string;

  @ApiProperty({ example: 'זן חזק...', required: false })
  description?: string;

  @ApiProperty({ example: 'Chem Sis', required: false })
  parent1?: string;

  @ApiProperty({ example: 'Sour Dubb', required: false })
  parent2?: string;

  @ApiProperty({ example: 'ארה"ב', required: false })
  origin?: string;

  @ApiProperty({ enum: ['היברידי', 'סאטיבה', 'אינדיקה'], example: 'היברידי', required: false })
  type?: string;

  @ApiProperty({ example: '#228B22' })
  color!: string;
}

export class EnrichGeneticsResponseDto {
  @ApiProperty({ type: [EnrichGeneticsItemDto] })
  genetics!: EnrichGeneticsItemDto[];
}
```

### 6.4 `backend/src/modules/terpene/dto/enrich-terpene.dto.ts`

```ts
import { ApiProperty } from '@nestjs/swagger';

export class EnrichTerpeneItemDto {
  @ApiProperty({ example: 'מירצן' })
  name!: string;

  @ApiProperty({ example: 'הטרפן הנפוץ ביותר...', required: false })
  description?: string;

  @ApiProperty({ example: 'אדמה, פירות יער', required: false })
  scent?: string;

  @ApiProperty({ example: 'מרגיע, משכך כאבים', required: false })
  effects?: string;

  @ApiProperty({ example: '#66BB6A' })
  color!: string;
}

export class EnrichTerpeneResponseDto {
  @ApiProperty({ type: [EnrichTerpeneItemDto] })
  terpenes!: EnrichTerpeneItemDto[];
}
```

## 7. Implementation Steps

### Step 7.1 — Add `enrichBatch` to `GeneticsService`

**File:** `backend/src/modules/genetics/genetics.service.ts`

Add `inject(LlmClientService)` to constructor.
Add new method:

```ts
async enrichBatch(names: string[]): Promise<void> {
  if (!names.length) return;

  // Step A: find which names are truly missing from DB
  const existingGenetics = await this.geneticsRepository
    .createQueryBuilder('g')
    .where('g.name IN (:...names)', { names })
    .select('g.name')
    .getMany();

  const existingNames = new Set(existingGenetics.map(g => g.name));
  const missingNames = names.filter(n => !existingNames.has(n));

  if (!missingNames.length) {
    this.logger.debug(`All ${names.length} genetics already exist in DB — skipping enrich.`);
    return;
  }

  this.logger.log(`Enriching ${missingNames.length} missing genetics via LLM...`);

  // Step B: call LLM with batch prompt
  const llmResponse = await this.llmClientService.generateResponse({
    prompt: buildGeneticsEnrichUserPrompt(missingNames),
    systemContext: GENETICS_ENRICH_SYSTEM_PROMPT,
  });

  const rawContent = llmResponse.content ?? '';
  const parsed = this.parseGeneticsResponse(rawContent, missingNames);

  // Step C: upsert all at once
  const entities = parsed.map(item => this.geneticsRepository.create(item));
  await this.geneticsRepository.save(entities);

  this.logger.log(`Enriched and saved ${entities.length} genetics.`);
}

private parseGeneticsResponse(content: string, requestedNames: string[]): Partial<Genetics>[] {
  // Strip markdown code fences if present
  const json = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(json);
  const genetics: Array<Partial<Genetics>> = parsed.genetics ?? [];

  return genetics.map(g => ({
    name: g.name?.trim() ?? '',
    description: g.description?.trim() || null,
    parent1: g.parent1?.trim() || null,
    parent2: g.parent2?.trim() || null,
    origin: g.origin?.trim() || null,
    type: g.type?.trim() || null,
    color: g.color?.trim() || '#808080',
  }));
}
```

### Step 7.2 — Add `enrichBatch` to `TerpeneService`

**File:** `backend/src/modules/terpene/terpene.service.ts`

Identical pattern to Step 7.1, adapted for `Terpene` entity and
`buildTerpeneEnrichUserPrompt`.

### Step 7.3 — Wire enrichment into `StrainHunterService`

**File:** `backend/src/modules/strain-hunter/strain-hunter.service.ts`

1. Add `inject(GeneticsService)` and `inject(TerpeneService)` to constructor.
2. After `strainRepository.save(entities)` in `fetchData()`, add:

```ts
// Extract unique names
const allGeneticsNames = [
  ...new Set(
    scraped.items
      .flatMap(item => [item.originStrain, item.parent1, item.parent2])
      .filter(Boolean)
      .filter(n => n !== 'לא ידוע' && n !== DEFAULT_VALUE)
  ),
];

const allTerpeneNames = [
  ...new Set(
    scraped.items
      .flatMap(item => item.terpenes.split(',').map(t => t.trim()))
      .filter(Boolean)
      .filter(n => n !== 'לא ידוע' && n !== DEFAULT_VALUE)
  ),
];

// Enrich in parallel — both are independent
await Promise.all([
  this.geneticsService.enrichBatch(allGeneticsNames),
  this.terpeneService.enrichBatch(allTerpeneNames),
]);
```

### Step 7.4 — Handle LLM parse errors gracefully

In both `GeneticsService.enrichBatch` and `TerpeneService.enrichBatch`:

```ts
private parseGeneticsResponse(content: string, requestedNames: string[]): Partial<Genetics>[] {
  try {
    // ... parsing logic
  } catch (parseError) {
    this.logger.warn(`Failed to parse LLM genetics response: ${parseError instanceof Error ? parseError.message : 'unknown'}. Raw content length: ${content.length}`);
    // Return empty — don't crash the whole fetchData
    return [];
  }
}
```

Same for terpene. If the LLM returns malformed JSON, the enrichment silently
skips for this batch. The next `fetchData` call will retry.

### Step 7.5 — Delete the TODO comment in tooltip.html

**File:** `frontend/src/app/components/shared/tooltip/tooltip.html`

Remove lines 33–34:
```html
<!-- TODO: ADD SMALL ICON BTN FOR ADMIN ONLY - ASK LlmClientService TO FILL MISSING GENETIC/TERPENE -->
```

The empty state remains clean:
```html
} @else {
    <div class="tooltip-card tooltip-card-empty">
        <span>אין מידע זמין</span>
    </div>
}
```

## 8. Edge Cases

| Edge case | Behavior |
|---|---|
| All genetics/terpenes already in DB | `enrichBatch` finds 0 missing → no LLM call → no-op |
| LLM returns malformed JSON | `parseGenetics/TerpeneResponse` catches, logs warning, returns `[]` → silently skips this batch |
| LLM returns fewer names than requested | Only the names that appear in the JSON are upserted. Missing ones will be retried on next `fetchData` |
| LLM hallucinates a name that doesn't match any requested | The `name` field in the response is used as-is. TypeORM upserts by `name`, so it will be created. This is acceptable — a hallucinated-but-plausible name is better than a gap. |
| Jane returns a name that is clearly invalid (e.g. "NaN") | Such names should be filtered out before calling `enrichBatch`. The extraction step should skip names matching `/^[^\\u0590-\\u05FF\\w]+$/` (no Hebrew or word chars) |
| DB is seeded with complete data for some, partial for others | `save()` only updates non-null fields. Partial records get filled in incrementally |
| Network failure to LLM | `LlmClientService.withRetry` handles 4 retries. If it still fails, `enrichBatch` throws, which propagates up and fails the whole `fetchData` → frontend shows error state. This is acceptable: the scrape succeeded, just the enrichment failed. Next `fetchData` retry will try again. |

## 9. Testing Strategy

### 9.1 Unit test — `GeneticsService.enrichBatch`

Test with a mock `geneticsRepository` and mock `llmClientService`:

1. **All names exist** → `geneticsRepository.find` returns all → no LLM call.
2. **Some names missing** → `geneticsRepository.find` returns subset →
   LLM is called → response is parsed → `geneticsRepository.save` is called
   with correct entities.
3. **LLM returns malformed JSON** → `parseGeneticsResponse` throws → method
   returns `[]` without crashing.
4. **Empty names array** → method returns immediately.

### 9.2 Integration test — full `fetchData` flow

1. Clear `genetics` and `terpenes` tables.
2. `fetchData(true)` with scraped items that include new names.
3. Assert: `genetics` table has rows for all new genetics names.
4. Assert: `terpenes` table has rows for all new terpene names.
5. Call `fetchData(true)` again.
6. Assert: no additional LLM calls (verify via mock/spy that LLM was not called).

### 9.3 Manual verification

1. Open the strain-hunter page with empty genetics/terpenes tables.
2. `fetchData()` runs → enrichment happens.
3. Hover a genetics chip → tooltip shows real data (description, parents, type).
4. Hover a terpene chip → tooltip shows real data (description, scent, effects).

## 10. Logging

Add structured logging at key points:

```
[GeneticsService] All 12 genetics already exist in DB — skipping enrich.
[GeneticsService] Enriching 3 missing genetics via LLM...
[GeneticsService] Enriched and saved 3 genetics.
[TerpeneService] Enriching 7 missing terpenes via LLM...
[TerpeneService] Failed to parse LLM response: Unexpected token... — skipping batch.
```

## 11. Files Touched (summary)

### New files (create)

| File |
|---|
| `backend/src/modules/genetics/constants/genetics-enrich-prompts.constant.ts` |
| `backend/src/modules/terpene/constants/terpene-enrich-prompts.constant.ts` |
| `backend/src/modules/genetics/dto/enrich-genetics.dto.ts` |
| `backend/src/modules/terpene/dto/enrich-terpene.dto.ts` |

### Modified files (edit)

| File | Change |
|---|---|
| `backend/src/modules/genetics/genetics.service.ts` | `+ enrichBatch(names[])`, inject `LlmClientService` |
| `backend/src/modules/terpene/terpene.service.ts` | `+ enrichBatch(names[])`, inject `LlmClientService` |
| `backend/src/modules/strain-hunter/strain-hunter.service.ts` | After `strainRepository.save()`, call both `enrichBatch()` in `Promise.all()` |
| `frontend/src/app/components/shared/tooltip/tooltip.html` | Delete TODO comment at line 33 |

### No frontend changes beyond deleting the TODO comment

The tooltip, stores, and `ngOnInit` are untouched.

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM returns wrong names or hallucinates | Low | Medium | Hallucinated names are still plausible. Partial data is better than none. |
| LLM parse failure blocks entire `fetchData` | Low | High | `parseGenetics/TerpeneResponse` wrapped in try/catch — on failure, logs warning and returns `[]`. `fetchData` succeeds with scraped items even if enrichment silently fails. |
| LLM prompt injection (malicious Jane data) | Very low | Medium | The LLM is called with `temperature: 0.2`. Names are extracted as plain strings — no code execution. |
| Concurrent `fetchData` calls (two users at once) race on enrich | Low | Low | TypeORM upsert is atomic per record. Duplicate names across concurrent calls are handled by `save()`. No lock needed at this scale. |
| `enrichBatch` called with thousands of names (very large scrape) | Low | Medium | The batch includes ALL unique names from scraped items. The LLM context window is the real limit. For now, the design assumes the Jane scrape returns ≤ ~100 unique genetics/terpenes per run — well within limits. If this becomes a concern, chunk into sub-batches of 20. |

## 13. Self-Review Checklist

- [ ] `GeneticsService.enrichBatch` skips LLM call when all names exist in DB.
- [ ] `TerpeneService.enrichBatch` skips LLM call when all names exist in DB.
- [ ] Batch LLM prompt returns structured JSON parsed correctly.
- [ ] `parseGeneticsResponse` / `parseTerpeneResponse` handle malformed JSON gracefully.
- [ ] `StrainHunterService.fetchData` calls both `enrichBatch` in parallel after save.
- [ ] `loadAll()` in Angular stores picks up enriched records on next page load.
- [ ] Frontend tooltip shows real data on first hover after enrichment.
- [ ] TODO comment removed from `tooltip.html`.
- [ ] No Hebrew mojibake in LLM prompts or parsed responses.
- [ ] Build passes: `npm run build -w backend` and `npx ng build`.
- [ ] Tests: unit tests for `enrichBatch` mock passing; integration test of full flow passing.
