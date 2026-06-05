# Claude Code Project Guide — Porat Monorepo

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- **Analyze the 'blast radius'**: Ask "What unexpected side effects could this have on unrelated parts of the system?" and "Could this change break something elsewhere?"
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Mandatory Pre-Flight Checklist

Before editing any file, the agent MUST:

1. Read the relevant local project guide:
   - `AGENTS.md`
   - Any directly relevant skill/rule file for the file type being changed
2. Identify the change type:
   - Angular component
   - Angular service
   - Angular store
   - CSS/global styles
   - NestJS controller/service/DTO
   - Other
3. State the applicable rules before implementation.
4. Find one existing nearby project example and follow its pattern.
5. Define success criteria and verification command.
6. Only then edit files.

For Angular page components, this is mandatory:

- Use `PageStates`
- Expose `readonly PageStates = PageStates`
- Use `pageState = computed<PageStates>(...)`
- Template must use:

```html
@switch (pageState()) {
  @case (PageStates.Loading) {}
  @case (PageStates.Error) {}
  @case (PageStates.Empty) {}
  @case (PageStates.Ready) {}
}
```

If the agent cannot identify the applicable pattern, it must stop and ask before editing.

## UTF-8 / Hebrew Safety Rule

When editing files that contain Hebrew text:

1. Always read the file with UTF-8 encoding before editing.
2. Never copy Hebrew text from terminal output that appears corrupted.
3. After editing, verify the file with UTF-8 reading.
4. Search for corrupted characters before finishing:

```bash
rg -n "׳|ג€�|ג†|ג€|�" path/to/file
```

If corrupted text is found, fix it before running build or returning the answer.

## 🔴 Golden Rules

1. Run tests BEFORE any refactoring: `npx ng test frontend --watch=false`
2. Every API change touches both sides: frontend service AND backend controller
3. No hardcoded CSS — only `var(--token)` from `_variables.css`, Generic global style High Priority - Came first.
4. Enums always start from `1`, never `0`
5. Prettier runs automatically via Hook — do not run manually
6. If Popo lopo messages via Telegram, replay with `mcp__plugin_telegram_telegram__reply`.
7. `tsconfig.app.json` include must be `src/**/*.ts` — never `src/**/*.d.ts`

## Project Overview

Full-stack monorepo: Angular frontend + NestJS backend.
Angular rules @`~/.CLAUDE/rules/angular-rules.md`
NestJS rules @`~/.CLAUDE/rules/nestjs-rules.md`

## CSS Architecture Rules (MANDATORY)

### File Structure

All styles live in `frontend/src/app/assets/styles/`:

- `_variables.css` — tokens only (colors, spacing, typography, shadows, radius)
- `_typography.css` — h1, h2, h3, p, label, .subtitle
- `_forms.css` — input, textarea, select, .form-group, input:focus
- `_buttons.css` — .btn-primary, .btn-ghost, .btn-danger
- `_layout.css` — .page, .card, .page-header, .page-footer, .glass-effect
- `_utilities.css` — .link, .divider, helper classes
- `styles.css` — @import statements ONLY, nothing else

### Component CSS Rules

- Component `.scss` files contain ONLY layout/structure unique to that component
- NO colors, shadows, font sizes, spacing values — use var(--token) only
- NO hardcoded hex/rgb/px — Golden Rule #3
- If a style could be reused in another component → it belongs in global files
- Prefer empty component CSS over duplicating global styles
- **MANDATORY Nesting**: Use CSS nesting for all component styles to match project patterns (e.g., `.parent { .child { ... } }`).
- **Zero Duplication**: NEVER redefine classes that already exist in global partials (`.page`, `.page-header`, `.card`, etc.). If a global class is used, it must be applied in HTML without being redefined in the component CSS.
- **Strict Token Audit**: Before writing CSS, read `_variables.css`. Never guess token names (e.g., use `--space-4`, NOT `--spacing-md`). If a token isn't in `_variables.css`, it doesn't exist.

### Class Naming Convention

- Generic names only: `.page`, `.card`, `.form`, `.form-group`, `.page-header`, `.page-footer`
- NEVER component-specific names like `.login-page`, `.login-card`
- **Strict Global Naming**: NEVER create or generalize global utility classes (e.g., `.sm`, `.lg`) without first running a project-wide search (`Grep`) to ensure the name isn't already used. Avoid introducing generic names that could collide with other libraries or elements.
- Glassmorphism via `::before` pseudo-element ONLY — never `backdrop-filter` directly on element

### Glassmorphism Pattern (MANDATORY)

.glass-effect {
position: relative;
isolation: isolate;
}
.glass-effect::before {
content: '';
position: absolute;
inset: 0;
border-radius: inherit;
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
z-index: -1;
}

## Directory Structure

- `frontend/src/app/components/` — Reusable presentation components
- `frontend/src/app/features/` — Feature modules and smart components
- `frontend/src/app/core/services/` — API clients
- `frontend/src/app/core/stores/` — Signal Stores
- `frontend/src/app/assets/styles/` — Global styles and `_variables.css`
- `backend/src/modules/` — Feature modules (Controller + Service + Entity)
- `backend/src/core/` — Database and environment configurations

## Build & Dev Commands

| Action        | Command                              |
| ------------- | ------------------------------------ |
| Frontend dev  | `npx ng serve frontend`              |
| Backend dev   | `npm run start:dev -w backend`       |
| Frontend lint | `npx ng lint frontend`               |
| Backend lint  | `npm run lint -w backend`            |
| Frontend test | `npx ng test frontend --watch=false` |
| Backend test  | `npm run test -w backend`            |

## Playwright Testing / Browser Rules

- Always use `data-testid` attributes — never `[ref=...]`
- Verify URL with `browser_snapshot` before every action
- Call `browser_wait_for` after navigation for Angular stability
- Use headless mode only
- One browser action at a time, confirm before next
- If session exceeds 15 tool calls, start fresh with /clear

## Documentation

- Use context7 when writing code that involves third-party library APIs

- **Sub-Agents for Scale:** For multi-step or complex tasks, spawn specialized sub-agents to parallelize work (e.g., one for backend DTO/Controller, one for frontend UI). The primary agent must review and integrate their diffs.
