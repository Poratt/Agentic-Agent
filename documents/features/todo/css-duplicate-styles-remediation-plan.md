# CSS Duplicate Styles Remediation Plan

## Goal

Systematically eliminate the duplicate styles, glass-effect reimplementations, hardcoded values, and structural violations identified in `documents/audit/css-duplicate-styles-report.md`, so that:

1. Every UI pattern has **one canonical home** (a global utility or a shared component class) and **zero ad-hoc copies** in feature components.
2. Every visible CSS value flows from a **design token** defined in `_variables.css` or `_layout.css`. No raw hex, no raw `rgba()`, no raw `px` (except where it is genuinely a non-token atomic unit like `1px` borders).
3. Every component CSS file is **properly scoped** under `:host { ... }` to prevent selector leakage and to make the file's responsibility obvious.
4. The `!important` count outside PrimeNG overrides drops to **zero** in feature CSS.
5. The build, the tests, and the rendered UI all stay green — this is a **behavior-preserving** refactor.

This plan is the bridge between the audit report and the actual codebase edits. It sequences the work so each step is small, verifiable, and reversible.

---

## Why this matters

Today the codebase has the same visual pattern declared in 9 different places (glass-effect `::before`), the same row layout pattern declared in 3 places with conflicting values, and `~80` raw `px` values that drift away from the design system on every change.

The cost is real:

- **Visual drift.** A theme token change in `_variables.css` updates some components but not others — we have already seen this with `--color-border` and skeleton bars.
- **Review friction.** Each new feature component is forced to reinvent `.row-label` or `.glass-effect`, then silently disagrees with the rest of the app.
- **Bug surface.** Conflicting declarations (`.row-label` in three files, `.row-meta` with three different font sizes) are exactly how a "row" looks subtly different in Strain Hunter vs. LLM Providers vs. Database Monitor.
- **Bundle bloat.** Several components are already over their CSS budget warnings (matching-preferences-drawer, strain-hunter, chat-message) — duplication is the largest contributor.

We have a one-shot opportunity to fix this before the duplication metastasizes into more feature components.

---

## Guiding principles

1. **Behavior preservation first.** No visual change that the user can see unless the duplication already caused a divergence. If two files disagree, the global utility wins — that is the resolution.
2. **Token-first, modifier-second.** A new visual variant should be a modifier on an existing global class (`.row-label--bold`), not a new component-scoped class.
3. **`:host`-scoped component CSS.** All selectors inside a component CSS file are nested under `:host { ... }`. No top-level selectors leak.
4. **One keyframe, one declaration.** Animations live in `_animations.css` and are referenced by name.
5. **`!important` is a code smell.** Allowed only for true global utilities (`.no-transitions`) and unavoidable PrimeNG overrides. Never in feature CSS.
6. **Audit report wins.** When the report says "remove duplicate lines 78-84 in `strain-hunter.css`", the plan removes exactly those lines and nothing else.

---

## Out of scope (called out explicitly)

- **Adding new design tokens** beyond the minimal set listed in the audit (lines 184-194). The audit was conservative — new tokens are added only when a real value appears in 3+ files.
- **Restructuring folders** under `frontend/src/app/assets/styles/`. The current split (`_variables.css`, `_layout.css`, `_utilities.css`, `_buttons.css`, `_forms.css`, `_animations.css`, `_primeng-overrides.css`, `_reset.css`) is fine.
- **Renaming global classes** beyond what the audit calls out (e.g. `.badge` → `.char-badge` only where the override was intentional).
- **Visual redesigns.** No new spacing scale, no new typography scale, no theme adjustments — just the audit findings.
- **HTML template rewrites** beyond the minimum needed for a class rename or a global-class swap. Components that already use the global class correctly stay untouched.

---

## Sequencing strategy

The work is split into **five sequential phases**, each ending in a green build and a measurable reduction in audit findings. Each phase is its own commit so we can bisect.

```
Phase 1 — Foundation: tokens & :host scoping         (~30 min)
Phase 2 — Quick wins: zero-risk removals             (~45 min)
Phase 3 — Row pattern unification                    (~1 hour)
Phase 4 — Glass-effect & tooltip consolidation      (~1 hour)
Phase 5 — Hardcoded values & !important cleanup      (~1.5 hours)
```

Each phase is followed by `npx ng build` and a manual spot-check of the touched pages. Tests are unchanged (no test files were touched, but we re-run them to confirm no regression).

---

## Phase 1 — Foundation: tokens & `:host` scoping

**Why first.** Every other phase either adds tokens or relies on `:host`-scoped selectors. Doing this first prevents re-introducing the same flat-selector problem during later refactors.

### ### 1.1 Migrate spacing scale to base 2px (Option X)

**This is a breaking change to the spacing scale.** The current 4px-base scale (lines 49-57 of `_variables.css`) is replaced with a 2px-base scale. Every consumer of `--space-*` in the codebase must update to the new mapping.

Current scale (4px base, line 49-57):

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

New scale (2px base, full arithmetic 1-26):

```css
:root {
  /* Spacing scale — base 2px, continuous */
  --space-1:  2px;
  --space-2:  4px;
  --space-3:  6px;
  --space-4:  8px;
  --space-5:  10px;
  --space-6:  12px;
  --space-7:  14px;
  --space-8:  16px;
  --space-9:  18px;
  --space-10: 20px;
  --space-11: 22px;
  --space-12: 24px;
  --space-13: 26px;
  --space-14: 28px;
  --space-15: 30px;
  --space-16: 32px;
  --space-17: 34px;
  --space-18: 36px;
  --space-19: 38px;
  --space-20: 40px;
  --space-21: 42px;
  --space-22: 44px;
  --space-23: 46px;
  --space-24: 48px;
  --space-25: 50px;
  --space-26: 52px;

  /* Border opacity for panel cells (audit 1.6) */
  --expand-opacity: 2%;
}
```

**Migration mapping** — every existing `--space-N` token must be doubled in the consumer code so the visible size stays the same:

| Old | New | Pixel value (unchanged) |
| --- | --- | --- |
| `--space-1`  (4px) | `--space-2`  (4px)   | 4px |
| `--space-2`  (8px) | `--space-4`  (8px)   | 8px |
| `--space-3`  (12px)| `--space-6`  (12px)  | 12px |
| `--space-4`  (16px)| `--space-8`  (16px)  | 16px |
| `--space-6`  (24px)| `--space-12` (24px)  | 24px |
| `--space-8`  (32px)| `--space-16` (32px)  | 32px |
| `--space-10` (40px)| `--space-20` (40px)  | 40px |
| `--space-12` (48px)| `--space-24` (48px)  | 48px |
| `--space-16` (64px)| `--space-32` (64px)  | 64px |

#### Step-by-step migration

1. **Update `_variables.css`**: replace the existing 9 spacing tokens with the 26 new ones above.
2. **Mechanical replacement across the codebase**: use a single search-and-replace per mapping. Example for `--space-1` → `--space-2`:
   ```bash
   rg -l "var\(--space-1\)" frontend/src/app | xargs sed -i 's/var(--space-1)/var(--space-2)/g'
   ```
   Repeat for each row in the table. **Word-boundary safety**: confirm no string contains `--space-1` followed by additional digits (e.g. `--space-10` must not be partially matched). The pattern `var(--space-1)` is safe because of the closing paren.
3. **Files affected** (from audit Category 5): `_utilities.css`, `_buttons.css`, `_forms.css`, `_layout.css`, `_primeng-overrides.css`, `_reset.css`, `_strain-hunter-filters.css`, `chat.css`, `chat-history.css`, `chat-message.css`, `design-system.css`, `explorer.css`, `header.css`, `main-sidebar.css`, `matching-preferences-drawer.css`, `strain-hunter.css`, `strain-hunter-settings.css`, `llm-providers-management.css`, `database-monitor-settings.css`, `tooltip.css`, `score-tooltip.css`.
4. **Verification after replacement**:
   - `rg -n "var\(--space-(1|3|5|6|7|9|11|13)\)" frontend/src/app` returns zero hits (these old token numbers should no longer appear).
   - `rg -n "var\(--space-(2|4|6|8|10|12|14|16|18|20|22|24|26)\)" frontend/src/app` returns the expected usage.
   - `npx ng build` passes.
   - Manual visual spot-check: every page should look pixel-identical to before.

#### Forbidden constructs (rejected during migration)

The migration must NOT introduce any of the following:

- **Half-step tokens** (`--space-0-5`, `--space-1-5`, `--space-2-5`, `--space-4-5`).
- **`calc()` expressions** for spacing values. Every spacing reference is `var(--space-N)` with a literal N.
- **Direct pixel values** in component CSS. After Phase 1, every visible spacing token in a component CSS file is sourced from `_variables.css`.

If a feature file genuinely needs a value outside the new scale (e.g. `1px` for a border), it stays as a literal `1px` — but the comment `/* atomic border */` is required so the grep-based audit can skip it.

#### New tokens available after migration

The audit's `2px`, `6px`, `10px`, `18px`, `28px`, `44px`, `52px` values are now all representable as token references:

| Audit value | New token |
| --- | --- |
| `2px`  | `--space-1` |
| `6px`  | `--space-3` |
| `10px` | `--space-5` |
| `18px` | `--space-9` |
| `28px` | `--space-14` |
| `44px` | `--space-22` |
| `52px` | `--space-26` |

This is the entire point of Option X — every audit-flagged value becomes a literal token reference.

### 1.2 Wrap flat selectors in `:host { ... }`

Affected files (audit Category 7):

| File | Action |
| --- | --- |
| `database-monitor-settings.css` | Wrap all selectors inside `:host { ... }` |
| `llm-providers-management.css` | Wrap all selectors inside `:host { ... }` and add `:host { display: block; }` at the top |
| `chat-history.css` | Promote `.sessions-list` and any other top-level selectors into `:host` |

Verification: `grep -nE "^[a-z]" <file>` should return zero hits after this step (all selectors must be indented inside `:host`).

### 1.3 Verification

- `npx ng build` from `frontend/` passes.
- No new visual regressions.

---

## Phase 2 — Quick wins: zero-risk removals

These are pure deletions or single-line replacements. No design decisions required.

### 2.1 Remove duplicate internal block in `strain-hunter.css`

Audit Category 9, lines 70-84. `.strain-rating` and `.strain-deal` are declared twice. Keep the first declaration (lines 70-76), remove the second (lines 78-84).

### 2.2 Remove `.custom-loader` duplicate from `chat.css`

Audit 1.10, lines 27-34. The global `.custom-loader` in `_utilities.css:199-208` already exists. Delete the duplicate from `chat.css`. If `chat.html` references `.custom-loader`, no HTML change is needed.

### 2.3 Replace hardcoded `blur(8px)` with token

Audit Category 4:

| File | Line | Change |
| --- | --- | --- |
| `_forms.css` | 18-19 | `backdrop-filter: blur(8px);` → `backdrop-filter: blur(var(--glass-blur));` |
| `_layout.css` | 303 | Same |

### 2.4 Remove duplicate `.search-clear-btn` (audit line 262)

`extract .search-clear-btn to global` is mentioned in the recommended priority. Locate every occurrence:

```bash
rg -n "\.search-clear-btn" frontend/src/app
```

If a single canonical definition already exists in `_utilities.css`, delete the duplicates from feature files. If none exists, promote the most-used version to `_utilities.css` and delete the others.

### 2.5 Verification

- Build passes.
- No visual regressions on chat, strain hunter, and search inputs.

---

## Phase 3 — Row pattern unification

This phase addresses audit Category 1.1, 1.2, 1.3, 1.5 — the duplicated row layout pattern. It is the highest-traffic pattern in the app.

### 3.1 Establish the canonical row classes

In `_utilities.css`, replace the current `.row-label`/`.row-meta` definitions with:

```css
/* Canonical row text — base variants */
.row-label {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* Modifiers — only added when 2+ feature files need them */
.row-label--bold   { font-weight: var(--font-weight-semibold); }
.row-meta--xs      { font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.row-meta--mono    { font-family: var(--font-code); }
```

Resolution of conflicts:

- `database-monitor-settings.css` uses **bold + xs**: it gets `.row-label .row-label--bold .row-meta .row-meta--xs`.
- `llm-providers-management.css` uses **mono for meta**: it gets `.row-label .row-meta .row-meta--mono`.

### 3.2 Extract `.row-title` / `.row-subtitle` to globals

Audit 1.3. Compare `strain-hunter-settings.css:6-20` and `llm-providers-management.css:87-103`. Identify the **intersection** of declarations. Move only the intersection to `_utilities.css`. Anything specific to one feature stays in its component file.

### 3.3 Extract `.panel-header` + `.panel-title` to globals

Audit 1.5. Same approach as 3.2 — intersection only.

### 3.4 Extract `.delete-confirmation` + `.warning-text` + `.action-btns`

Audit 1.8. The shared layout (icon + text + button row) belongs in `_utilities.css`. Per-component tweaks (colors, sizing) stay in the component file.

### 3.5 Extract `.user-profile` pattern

Audit 1.9. Extract the avatar + name layout to `_utilities.css` with a `--user-avatar-size` modifier for the two observed sizes (40px in header, 32px in sidebar).

### 3.6 Verification

- Open Strain Hunter Settings, LLM Providers Management, Database Monitor, Chat History, and the main header.
- Rows should look **identical** between components that share the canonical class.
- Build passes.

---

## Phase 4 — Glass-effect & tooltip consolidation

Audit Category 2 (9 locations) and Category 8 (duplicate keyframes).

### 4.1 Consolidate glass-effect pattern

The canonical home is `.glass-effect::before` in `_utilities.css:92-100`. The audit correctly recommends that `.card`, `.metric-card`, and `.table-container` should **use** `.glass-effect`, not reimplement it.

Approach:

1. In `_layout.css`, remove the `::before` block from `.card`, `.metric-card`, and `.table-container` (lines 117-125, 160-168, 253-261).
2. Add `glass-effect` to the class list on each element that should still be a glass surface.
3. The remaining rules (`background: var(--glass-bg)`, `border`, `box-shadow`) stay on `.card` etc. — only the `::before` is hoisted to `.glass-effect`.

Important: do **not** force glass-effect onto `.p-datatable-thead` or `.p-tooltip .p-tooltip-text` (PrimeNG-internal selectors). Those stay as-is.

### 4.2 Resolve conflicting `.glass-effect` uses

Spot-check every component that uses `glass-effect` and confirm it has `border` + `border-radius`. If a component used `.glass-effect` only for the `::before` and not for `background`/`border`, it must add those on its own root or the visual changes.

### 4.3 Consolidate `tooltipFadeIn` / `tooltipReveal` keyframes

Audit Category 8. The two keyframes are identical (`opacity: 0 → 1`). Move one canonical `fadeIn` to `_animations.css` (or `_utilities.css` if `_animations.css` doesn't exist — create it). Delete both local copies.

### 4.4 Verification

- Every page that had glass surfaces still renders glass surfaces.
- Tooltips still animate.

---

## Phase 5 — Hardcoded values & `!important` cleanup

The longest phase, but mostly mechanical.

### 5.1 Replace hardcoded colors (Category 3)

| File | Line | Token |
| --- | --- | --- |
| `_layout.css` | 135 | `var(--color-border)` |
| `chat-message.css` | 164 | `var(--glass-bg)` |
| `chat-message.css` | 182 | `var(--color-primary-glow-bg)` |
| `_buttons.css` | 173 | `var(--shadow-soft)` (or new `--shadow-button`) |
| `_utilities.css` | 373 | Shadow token |

For the `--color-table-*` reference at `database-monitor-settings.css:6-12`: the audit was wrong here — those tokens are already defined globally (verified 2026-07-09 in `_variables.css:93-98`). **Do not touch this line.** Document this finding as an audit correction.

### 5.2 Replace remaining hardcoded `px` values (Category 5)

Process file by file. For each hardcoded value:

1. If it matches a token we added in Phase 1, replace it.
2. If it appears in 3+ files and is missing from the token list, add a new token in Phase 1 retroactively.
3. If it's a one-off, leave it but add a `/* TODO: tokenize */` comment so we can spot the long tail later.

Files to process in order:

1. `matching-preferences-drawer.css`
2. `strain-hunter.css`
3. `strain-hunter-settings.css`
4. `_strain-hunter-filters.css`
5. `llm-providers-management.css`
6. `_buttons.css`
7. `_utilities.css`
8. Everything else

### 5.3 Resolve conflicting `.expand-panel-cell` opacity (audit 1.6)

The 2%/4% disagreement between `strain-hunter-settings.css` and `llm-providers-management.css` is resolved by the new `--expand-opacity` token from Phase 1. Use:

```css
background: color-mix(in srgb, var(--color-text-primary) var(--expand-opacity), transparent);
```

### 5.4 Eliminate `!important` in feature CSS

Audit Category 6 lists 10 uses that need review. The only acceptable feature-CSS use is `.no-transitions` (a global utility). For each of the remaining 9:

1. Identify what the `!important` is overriding.
2. If it's overriding a global, increase specificity in the global instead (use `.parent-class .child-class { ... }` or `:where()` reordering).
3. If it's overriding a PrimeNG internal, move the rule to `_primeng-overrides.css` with the rest of the PrimeNG-specific overrides.

The 25 `!important` in PrimeNG overrides are **out of scope** — they're an established pattern.

### 5.5 Resolution of conflicting `.badge` / `.tag` redefinitions (audit 1.11, 1.12)

`.badge` in `strain-hunter.css` is **different on purpose** (square vs pill). Rename it to `.family-badge` per audit recommendation. Search the codebase for `.badge` usage in `strain-hunter.html` to make sure all callers update.

`.tag` in `database-monitor-settings.css` overrides background + adds gap. Rename the override to `.db-chip` per audit recommendation.

### 5.6 Verification

- Build passes.
- `rg -n "!important" frontend/src/app/features/` returns zero hits.
- `rg -n "rgba\(" frontend/src/app --include="*.css"` returns only the canonical lines in `_variables.css`.
- Manual spot-check on Strain Hunter, LLM Providers, Database Monitor, Chat, Chat History, Settings.

---

## Risks & mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Visual regression from glass-effect consolidation | Medium | Phase 4 is its own commit. Each component is verified before moving to the next. |
| `.row-label--bold` modifier not applied at a call site, breaking row look | Medium | The HTML change is part of Phase 3, not a follow-up. After Phase 3, grep all `.row-label` usages and confirm each call site has the right modifiers. |
| New `--space-*` tokens break existing assumptions (e.g. someone used `--space-7` already with a different value) | Low | Grep all new tokens before adding. |
| Audit report has incorrect claim about `--color-table-*` (we confirmed it already exists globally) | Confirmed | Phase 5.1 documents the correction. Apply the same audit-claim verification process to every other audit item before editing. |
| `!important` removal breaks PrimeNG theming | Medium | Phase 5.4 only touches feature CSS, not PrimeNG overrides. If a feature's `!important` was actually overriding PrimeNG, it gets moved to `_primeng-overrides.css`, not removed. |
| Glass-effect removal breaks the `::after` highlight on `.card` | Low | The `::after` highlight on `.card` (lines 127-137) is a different pseudo-element and stays untouched. |

---

## Definition of done

For each phase:

- `npx ng build` from `frontend/` passes with **no new warnings**.
- `npx ng test --watch=false` passes (no test changes required, but confirms no regression).
- All touched files have no mojibake (Hebrew text only — none in CSS files).
- All touched files are properly nested under `:host { ... }`.

For the whole plan:

- The audit report's categories are updated with green checkmarks (or, for the `--color-table-*` finding, marked as "audit correction").
- `rg -n "!important" frontend/src/app/features/` returns **zero hits**.
- `rg -n "rgba\(255" frontend/src/app/assets/styles/` returns **only** the canonical `rgba(255, 255, 255, 0.12)` in `_variables.css` (the source of `--color-border`).
- `rg -nE "^[a-zA-Z\.\#]" frontend/src/app/features/**/*.css` returns **only** selectors inside `:host { ... }`.
- Total CSS bytes for feature components drops measurably (target: 15-20% reduction across `database-monitor-settings.css`, `llm-providers-management.css`, `strain-hunter.css`).

---

## Commit strategy

One commit per phase. Commit messages follow the project convention (e.g. `refactor(css): consolidate glass-effect ::before into .glass-effect`). Pre-commit hooks run Prettier automatically — no manual formatting step.

Suggested sequence:

```
refactor(css): add spacing/expand-opacity tokens; scope flat selectors under :host
refactor(css): remove .custom-loader, .strain-rating, .strain-deal duplicates
refactor(css): extract .row-label/.row-meta/.row-title canonical variants
refactor(css): consolidate .glass-effect ::before into a single source
refactor(css): tokenize remaining rgba/px values; remove feature !important
```

---

## Follow-up (out of scope for this plan)

- A pre-commit hook that fails if a feature CSS file contains `rgba(`, raw `px` outside known atomic values (`1px` borders), or `!important`.
- A CSS budget watcher (current budget warnings in `matching-preferences-drawer`, `strain-hunter`, `chat-message` are pre-existing and should drop naturally once duplicates are removed).
- A design-system page that documents the canonical classes (`.row-label`, `.glass-effect`, `.card`, `.metric-card`, etc.) so future components don't reinvent them.

---

## Resolved decisions

1. **Token naming.** Approved: use the audit's natural extension verbatim (`--space-0-5`, `--space-1-5`, `--space-2-5`, `--space-4-5`, `--space-7`, `--space-11`, `--space-13`). The scale is intentionally non-arithmetic and matches real design intent — these tokens fill the gaps where the existing `--space-1`…`--space-10` scale skips.
2. **Audit correction on `--color-table-*`.** Approved: the audit's recommendation is dropped for these lines. The tokens already exist globally in `_variables.css:93-98`. Add a single inline note in `database-monitor-settings.css` documenting that `--color-table-1` through `--color-table-7` are intentionally sourced from the global token set, and skip the rewrite.
3. **Phase 5.5 rename scope.** Approved: the renames (`.badge` → `.family-badge` in `strain-hunter.html`/`.css`, `.tag` → `.db-chip` in `database-monitor-settings.html`/`.css`) are part of this plan, not a separate commit. They are small, mechanical, and tightly coupled to the rest of Phase 5.

---

## Agent checklist

This plan is meant to be executed by one agent in five sequential commits, with build + test verification at every phase boundary. If a phase takes longer than expected, do not start the next phase — break the work down further or surface a blocker.