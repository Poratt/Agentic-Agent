# Business Idea Generator — Plan

## Goal

Build a short agentic loop (2-3 steps) that:
1. Gathers real market signals (search) for a given domain
2. Generates N business ideas grounded in those signals
3. Validates each idea via web search (market/competitor research)
4. Produces concrete next steps for each validated idea

This is a **lightweight generator**, not a full AI agent with tool-calling loops. The user provides a domain, gets back a ranked list of ideas with validation scores and next steps.

## Architecture / Flow

```
User input (domain + count)
        │
        ▼
┌─────────────────────┐
│  Signal Gathering   │  ← Phase 0: search for real pain points/trends
│  (SearXNG × 2–3)    │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Idea Generation    │  ← Phase 1: LLM → N ideas, grounded in signals
│  (LLM, JSON)        │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Validation +       │  ← Phase 2: per idea — search competitors
│  Next Steps         │              → LLM scores + risks + steps
│  (LLM × N)          │              (merged into one call per idea)
└─────────────────────┘
        │
        ▼
Return: BusinessIdea[] sorted by validationScore descending
```

**Key change from first draft:** Signal gathering happens **before** generation, not only during validation. This grounds the LLM in real pain points instead of letting it hallucinate ideas freely.

## Prerequisites (Out of Scope for This Plan, Must Exist First)

The following are **not** part of this plan but are hard dependencies:

1. **Switch WebSearchService from Tavily to SearXNG** — ✅ DONE. `WebSearchService` now calls a self-hosted SearXNG instance (`SEARXNG_URL`, optional `SEARXNG_API_KEY`), same `search()` signature and DTO shape. `TAVILY_API_KEY` left in `.env` but unused. `genetics`/`terpene` consumers untouched (they only read `result.results` + `result.answer`).

2. **Install `@nestjs/throttler`** — ✅ DONE. `@nestjs/throttler@^6.5.0` installed (NestJS 11 compatible). AppModule wiring + `@Throttle` guard deferred to Phase 3, scoped to the public ideas endpoints so existing authenticated routes are not affected.

3. **Cache layer for search results** — not currently in the codebase. Without it, identical domains from different users generate redundant SearXNG calls. Consider a simple in-memory TTL cache (e.g., `node-cache` with 5-minute TTL) keyed by normalized domain string. (Phase 4 — optional.)

## Data Model

### BusinessIdea (output interface)

```typescript
export interface BusinessIdea {
  title: string;
  description: string;
  targetMarket: string;
  validationScore: number;       // 1–10
  validationReason: string;      // short Hebrew explanation
  risks: string[];
  competitors: string[];         // top 3–5 competitors found
  nextSteps: string[];
  signalsReferenced: string[];   // pain points / trends from signal gathering
  groundedInSignals: boolean;    // false if Phase 0 failed → fallback mode
}

export interface GenerateIdeasResponse {
  success: boolean;
  message: string;
  partial: boolean;              // true if some ideas failed due to timeout/error
  result: BusinessIdea[];
  failedCount?: number;           // present only when partial === true
}

export interface RawIdea {
  title: string;
  description: string;
  targetMarket: string;
}

export interface ValidationResult {
  validationScore: number;
  validationReason: string;
  risks: string[];
  competitors: string[];
  nextSteps: string[];
  signalsReferenced: string[];
}
```

## Module Structure

```
backend/src/modules/ideas/
├── ideas.module.ts
├── ideas.controller.ts
├── ideas.service.ts
├── interfaces/
│   └── idea.interface.ts
├── constants/
│   └── idea-prompts.constant.ts
└── dto/
    ├── generate-ideas.dto.ts
    └── idea-result.dto.ts
```

## API Contract

### `POST /ideas/generate`

**Request body:**
```typescript
{
  domain: string;   // e.g. "AI-powered productivity tools for freelancers"
  count?: number;   // default 5, max 10
}
```

**Response:**
```typescript
{
  success: true;
  message: string;
  partial: boolean;             // true if some ideas failed
  result: BusinessIdea[];       // sorted by validationScore descending
  failedCount?: number;         // present only when partial === true
}
```

**Errors:**
- `400` — domain is empty, too long (>500 chars), contains invalid characters, or count out of range
- `429` — rate limit exceeded (see below)
- `503` — LLM or search service unavailable

### Rate Limiting

**Weighted throttle** — count is used as request weight to prevent cost amplification:

| Limit | Threshold |
|-------|-----------|
| Per IP per minute | `sum(count) <= 30` per request, max 10 requests |
| Per IP per hour | `sum(count) <= 150` |

Each request consumes `max(count, 1)` weight units from the IP quota. A single request with `count=10` uses 10 units.

Example: an attacker hitting `count=10` 10 times in a minute gets 10 × 10 = 100 units → blocked (limit: 30/min).

**429 response body:**
```typescript
{
  statusCode: 429,
  message: 'חרגת ממכסת הבקשות. נסה שוב בעוד דקה.',
  retryAfter: 60 // seconds
}
```

**Implementation note (throttler v6 has no `weight`):** `@nestjs/throttler@^6` removed the `weight` parameter — `storageService.increment()` always adds exactly 1 hit. To honor the cost-based quota above, a custom `IdeasThrottlerGuard extends ThrottlerGuard` loops `storageService.increment()` `weight = max(count, 1)` times per request, summing `totalHits` against the limit. Two named throttlers are defined in `AppModule` (`ideasCostShort`: 30/60s, `ideasCostLong`: 150/3600s) and scoped to `/ideas/*` via `skipIf` so existing authenticated routes are untouched. The guard also overrides `throwThrottlingException` to emit the exact Hebrew 429 body with `retryAfter`. The secondary "max 10 requests/min" cap is subsumed by the cost limit (4×count=10 already exceeds 30).

### Domain Sanitization

Before building search queries, `domain` is sanitized:
- Trim whitespace, collapse multiple spaces to single space
- Max length: 500 characters
- Strip characters that could break query strings: backticks, newlines, angle brackets, quotes
- Normalize to lowercase for cache key
- If sanitized domain differs from input → reject with 400

If sanitization produces an empty string → reject with 400.

## Prompt Design

### SIGNAL_GATHERING_PROMPT (Hebrew)

Input: `{ domain: string }`

Output: 3–5 specific pain points or market signals as a JSON array of `{ signal: string, source: string }`.

Example output:
```json
[
  { "signal": "Freelancers report spending 6–8 hours/week on admin tasks", "source": "Upwork survey 2024" },
  { "signal": "No AI tool integrates natively with Israeli invoicing systems", "source": "Market gap analysis" }
]
```

### IDEA_GENERATION_PROMPT (Hebrew)

Input: `{ domain: string, signals: Signal[], count: number }`

System context: "You are a startup analyst. Generate ideas that directly address the pain points below. Do not invent pain points — use only the signals provided."

Output: N ideas as JSON array matching `RawIdea[]`.

### VALIDATION_PROMPT (Hebrew)

Input: `{ idea: RawIdea, searchResults: TavilyResults, signals: Signal[] }`

System context: "You are a startup analyst. Score honestly — if the idea is saturated or risky, say so."

Output: JSON matching `ValidationResult`.

## Implementation Phases

### Phase 0 — Signal Gathering (New Phase) ✅ Implemented (in `ideas.service.ts`)

File: `backend/src/modules/ideas/ideas.service.ts` (add method)

Tasks:

- Sanitize domain string before use (see Domain Sanitization above).
- Build 2–3 search queries from the domain string:
  - `"pain points in [domain] 2024 2025"`
  - `"trends in [domain] market gaps"`
  - `"challenges [domain] freelancers / businesses"`
- Call `WebSearchService.search()` for each query (in parallel, max 3).
- Merge results → LLM extract top 3–5 signals (`SIGNAL_GATHERING_PROMPT`).
- Pass signals forward to Phase 1.
- **Fallback behavior:** If signal gathering fails (search error or LLM parse error):
  - Continue with Phase 1 and Phase 2 using an empty signals array.
  - Set `groundedInSignals: false` on all returned ideas.
  - Set `partial: true` in the response.
  - Message indicates degraded confidence: `"נוצרו רעיונות ללא עיגון במחקר שוק — התוצאות עשויות להיות פחות מבוססות"`.

### Phase 1 — Module Scaffold ✅ Implemented (`ideas.module.ts`, `interfaces/`, `constants/`)

Files to create:

- `backend/src/modules/ideas/ideas.module.ts`
- `backend/src/modules/ideas/interfaces/idea.interface.ts`
- `backend/src/modules/ideas/constants/idea-prompts.constant.ts`

Tasks:

- Register `IdeasModule` in `AppModule`.
- Import `LlmModule` and `WebSearchModule`.
- Export `IdeasService` for potential internal reuse.
- **Note:** Rate limiting is applied at the controller level, not in the service.

Verification: `npm run build` from `backend/`.

### Phase 2 — Service Core ✅ Implemented (`ideas.service.ts`)

File: `backend/src/modules/ideas/ideas.service.ts`

Tasks:

- Inject `LlmClientService` and `WebSearchService`.
- Implement `generateIdeas(domain, count)`:

  ```
  1. Signal gathering (Phase 0) → Signal[] + groundedInSignals flag
  2. Call LLM with IDEA_GENERATION_PROMPT + signals → parse JSON → RawIdea[]
  3. Per idea (max 3 parallel, using Promise.allSettled):
       - WebSearchService.search(competitors query)
       - LLM with VALIDATION_PROMPT + searchResults + signals → ValidationResult
  4. Merge RawIdea + ValidationResult → BusinessIdea[]
  5. Sort by validationScore descending
  6. Return { ideas, partial, failedCount }
  ```

- Handle JSON parse errors gracefully (LLM might output markdown code blocks — strip code fences before parsing).
- **Partial results mechanism:**
  - Use `Promise.allSettled` for per-idea validation batch.
  - Collect fulfilled results; track rejected ones (search error, LLM error, parse error).
  - `partial = true` if `failedCount > 0`.
  - `failedCount` = number of ideas that failed validation.
  - Return what succeeded; do not block the response.
- **Timeout:** 60-second overall deadline for the entire `generateIdeas` call.
  - If deadline is reached mid-batch, return partial results immediately (don't wait for remaining ideas).
- Pass `signalsReferenced` and `groundedInSignals` through from Phase 0 into final output.

Verification: `npm run build` from `backend/`.

### Phase 3 — Controller + DTOs ✅ Implemented (`ideas.controller.ts`, `dto/generate-ideas.dto.ts`, `dto/idea-result.dto.ts`, `guards/ideas-throttler.guard.ts`)

Files to create:

- `backend/src/modules/ideas/ideas.controller.ts`
- `backend/src/modules/ideas/dto/generate-ideas.dto.ts`
- `backend/src/modules/ideas/dto/idea-result.dto.ts`

Tasks:

- `POST /ideas/generate` endpoint with `GenerateIdeasDto`.
- `GenerateIdeasDto` validates: domain is non-empty, max 500 chars, no injection characters (see Sanitization above).
- Apply weighted `@Throttle()` guard at controller level:
  - `defaultLimiter`: 10 requests / minute, weight = `max(count, 1)` per request
  - `shortLimiter`: 50 requests / hour, weight = `max(count, 1)`
- Return `GenerateIdeasResponse` (not `ServiceResultContainer` — custom shape with `partial` and `failedCount`).
- Add `@ApiOperation` with `genUiSpec` so `SwaggerToolsParser` auto-detects this as a GenUI tool.
- Add Swagger decorators for all response shapes (200, 400, 429, 503).
- No JWT auth required (public endpoint).

Verification: `npm run build` from `backend/`.

### Phase 4 — Search Result Cache (Optional)

File: `backend/src/modules/ideas/ideas.service.ts` (extend)

Tasks:

- Add `node-cache` or similar TTL cache.
- Cache key: normalized domain string (lowercase, trimmed, sorted query params if any).
- TTL: 5 minutes.
- Cache search results keyed by search query string.
- On cache hit → skip `WebSearchService.search()` call.

**Deferred** — implement only if repeated requests to similar domains become a real cost problem.

### Phase 5 — Frontend UI ✅ Implemented (in `features/ideas/`, `core/store/ideas.store.ts`, `core/services/ideas.service.ts`, `core/models/idea.interface.ts`)

**Domain role:** The `domain` field is the **search scope** for SearXNG, not a generic input. SearXNG runs specific queries like `"freelancer AI tools" reddit "frustrated with"` — without the user's domain, there is nothing to search. The user sets direction; pain points come from real search results.

**Flow summary:**
```
1. User types domain (e.g. "כלי AI לפרילנסרים")
        ↓
2. System builds queries: "freelancer AI tools" reddit "pain point"
        ↓
3. SearXNG → real posts from Reddit/HN
        ↓
4. LLM extracts pain points from results (not hallucinated)
        ↓
5. LLM generates ideas addressing those pain points
```

#### Screen Structure

1. **Input section** — domain text field + count slider (1–10), "צור רעיונות" button
2. **Progress indicator** — 3-segment bar showing current phase:
   - Phase 0 → "מחפש סיגנלים בשוק..."
   - Phase 1 → "מייצר רעיונות..."
   - Phase 2 → "מאמת מול מתחרים..." (per-idea, updates as each completes)
3. **Partial banner** (conditional) — "הוצגו X מתוך Y רעיונות" at top when `partial: true`
4. **Idea cards** — responsive grid, each `BusinessIdea` as a card:
   - `validationScore` badge: green (7–10), yellow (4–6), red (1–3)
   - Title + description
   - `groundedInSignals: false` → warning badge "ללא עיגון במחקר שוק"
   - Expandable sections for `risks`, `competitors`, `nextSteps`
   - Competitor count badge (e.g. "3 מתחרים נמצאו")
5. **Bottom status line** — "הוצגו X מתוך Y רעיונות"

#### Angular Architecture

**Signal Store** (`ideas.store.ts`):
```typescript
// signals: domain, count, ideas[], loading, phase, partial, error
```

**Service** (`ideas.service.ts`):
- Uses `HttpClient` + `subscribe`, NOT `httpResource` — this is a POST, `httpResource` is designed for reads.
- Returns `Observable<GenerateIdeasResponse>`.
- Updates store signals manually on response.

**Components**:
- `ideas-page.component` — standalone page container, uses `PageStates`
- `ideas-form.component` — domain input + count slider + submit button
- `ideas-progress.component` — 3-phase progress bar with dynamic phase text
- `idea-card.component` — single idea card with score badge and expandable sections
- `ideas-grid.component` — responsive grid of `idea-card` components + partial banner

**CSS rules**:
- Use global design system classes (`card`, `glass-effect`, `badge`, `subtitle`, etc.)
- No component-specific CSS unless global classes are insufficient
   - Validation score badge colors via `--bg-success` / `--bg-warning` / `--bg-error`
  - `dir="ltr"` for technical values (scores, counts) embedded in RTL layout
  - **Consistency rule:** every numeric/score value MUST be wrapped in `<span dir="ltr">…</span>` (e.g. `<span dir="ltr">8/10</span>`). The mockup above does NOT yet do this on the `8/10` / `5/10` badges — fix when building. Without it, some browsers visually flip digits next to Hebrew text.

#### Mockup

```html
<div dir="rtl" style="font-family: var(--font-sans);">

  <!-- Input form -->
  <div style="background: var(--surface-2); border: 0.5px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
    <label style="font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 6px;">תחום עסקי</label>
    <input type="text" value="כלי AI לפרילנסרים" style="width: 100%; margin-bottom: 12px;" />
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
      <label style="font-size: 13px; color: var(--text-secondary); white-space: nowrap;">מספר רעיונות</label>
      <input type="range" min="1" max="10" value="5" step="1" style="flex: 1;" />
      <span style="font-size: 14px; font-weight: 500; min-width: 20px;">5</span>
    </div>
    <button style="background: var(--fill-brand); color: var(--on-brand); border: none; width: 100%;">צור רעיונות</button>
  </div>

  <!-- 3-phase progress indicator -->
  <div style="background: var(--surface-1); border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
      <div style="flex:1; height: 4px; border-radius: 2px; background: var(--fill-accent);"></div>
      <div style="flex:1; height: 4px; border-radius: 2px; background: var(--fill-accent);"></div>
      <div style="flex:1; height: 4px; border-radius: 2px; background: var(--border);"></div>
    </div>
    <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
      <i class="ti ti-search" style="font-size:15px; vertical-align:-2px; margin-left:4px;" aria-hidden="true"></i>
      מאמת מול מתחרים בשוק...
    </p>
  </div>

  <!-- Idea cards grid -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">

    <!-- High-score card -->
    <div style="background: var(--surface-2); border: 0.5px solid var(--border); border-radius: 12px; padding: 1rem 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <p style="font-weight: 500; font-size: 15px; margin: 0;">חשבונית אוטומטית לפרילנסרים</p>
        <span style="background: var(--bg-success); color: var(--text-success); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); white-space: nowrap;">8/10</span>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 10px;">אינטגרציה ישירה עם מערכות חשבוניות ישראליות, ללא צורך בהזנה ידנית.</p>
      <div style="border-top: 0.5px solid var(--border); padding-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
        <span style="background: var(--surface-1); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); color: var(--text-secondary);">מבוסס על סיגנלים</span>
        <span style="background: var(--surface-1); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); color: var(--text-secondary);">3 מתחרים נמצאו</span>
      </div>
    </div>

    <!-- Low-score card with warning -->
    <div style="background: var(--surface-2); border: 0.5px solid var(--border); border-radius: 12px; padding: 1rem 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <p style="font-weight: 500; font-size: 15px; margin: 0;">מעקב שעות חכם עם AI</p>
        <span style="background: var(--bg-warning); color: var(--text-warning); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); white-space: nowrap;">5/10</span>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 10px;">שוק רווי יחסית, אך יש פוטנציאל בנישה של פרילנסרים דוברי עברית.</p>
      <div style="border-top: 0.5px solid var(--border); padding-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
        <span style="background: var(--bg-warning); font-size: 12px; padding: 3px 10px; border-radius: var(--radius); color: var(--text-warning);">
          <i class="ti ti-alert-triangle" style="font-size:13px; vertical-align:-2px; margin-left:3px;" aria-hidden="true"></i>
          ללא עיגון מלא
        </span>
      </div>
    </div>

  </div>

  <p style="font-size: 12px; color: var(--text-muted); margin-top: 1rem;">הוצגו 5 מתוך 5 רעיונות</p>
</div>
```

#### Verification

- `npx ng build` from `frontend/`
- Page loads with input form and progress indicator
- Submit with valid domain → cards appear sorted by score
- `groundedInSignals: false` → warning badge visible on affected cards
- `partial: true` → banner appears at top with failed count
- Browser test: `/ideas` route loads correctly

## Future Work (Out of Scope)

- Save idea results to database
- Share/export ideas
- Idea refinement loop (user selects one idea → deeper analysis)
- Multi-language domain support
- Switching the LLM model used per phase (generation vs. validation)

## Testing Checklist

### Backend

- `npm run build` from `backend/` — compiles without errors
- `POST /ideas/generate` with valid domain returns array of ideas with `success: true` and `partial: false`
- `POST /ideas/generate` with empty domain returns 400
- `POST /ideas/generate` with domain > 500 chars returns 400
- `POST /ideas/generate` with domain containing `<script>` or newlines returns 400
- `POST /ideas/generate` exceeds weighted rate limit → returns 429
- Each returned idea has all fields populated including `groundedInSignals: true`
- Ideas are sorted by `validationScore` descending
- `signalsReferenced` field is populated (non-empty) when Phase 0 succeeds
- LLM JSON parse error does not crash the service
- Web search failure for one idea → `partial: true`, `failedCount: 1`, other ideas returned
- Signal gathering failure → `groundedInSignals: false` on all ideas, `partial: true`, fallback message
- Timeout mid-batch → partial results returned with `partial: true` and `failedCount > 0`

## Dependencies

- `LlmClientService` — existing, text generation
- `WebSearchService` — existing (must switch from Tavily to SearXNG first)
- `@nestjs/throttler` — must be installed first (not currently in project)
- `node-cache` — optional, for Phase 4

## Open Decisions

- Should the endpoint require authentication? — Default to public with rate limiting for now, lock down later if needed.
- Max concurrent validation calls? — Default to 3 parallel.
- Should signal gathering failures block the whole flow, or just degrade gracefully? — Graceful degradation (continue with LLM-only generation).
- **Phase 2 progress indicator — real streaming vs. fake progress:** The Phase 2 backend spec is a single synchronous `POST` that returns the full response at the end (60s timeout). The 3-segment progress bar in the mockup therefore cannot reflect real server-side phase transitions over a plain REST call — the client only learns the result once the blocked request resolves. Two options:
  - **SSE** — switch `POST /ideas/generate` (or add a streaming variant) to Server-Sent Events, emitting `phase` progress events as the backend moves through Phase 0 → 1 → 2. Consistent with the existing chat-streaming pattern in `agentic-admin`. Real, accurate progress.
  - **Fake progress** — client-side timer that animates the 3 segments based on average phase duration, with no real link to server state. Simpler, but the bar is cosmetic until the final response arrives.
  - **Decision: SSE, separate route (not modifying the existing POST).** Add `GET /ideas/generate/stream` (query params: `domain`, `count`). Emits events: `{ phase: 0|1|2, status: string, ideaIndex?: number }`; final event: `{ phase: 'done', result: GenerateIdeasResponse }`. `POST /ideas/generate` stays unchanged for synchronous consumers (tests, GenUI tool call, integrations that don't need streaming). Rationale: SSE reuses the existing chat-streaming infrastructure and gives real progress; a separate route keeps the REST contract clean.
