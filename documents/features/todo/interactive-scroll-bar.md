# Timeline Scrollbar — Complete Implementation Plan

## Overview

A vertical, generic scrollbar component with interactive dots representing page sections.
- Hover on a dot → tooltip displays section name
- Click → smooth scroll to the corresponding section
- Active dot updates automatically during scroll (IntersectionObserver)

---

## Phase 0: Research & Preparation (0.5h)

### Goals
- Verify the plan matches project conventions
- Find potential usage locations for the component

### Checklist
- [ ] Read `css-rules.md`, `angular-rules.md`
- [ ] Check if scroll tracking exists in project (grep `IntersectionObserver`, `scroll`, `scrollTop`)
- [ ] Check if there are pages with many sections that could benefit from this component
- [ ] Verify CSS token naming conventions in `_variables.css`
- [ ] Verify component naming conventions in project

### Deliverable
Brief research doc with decisions on:
- Component name (`app-timeline-scrollbar`)
- Directory location (`components/shared/timeline-scrollbar/`)
- Usage scope: specific page or generic for all pages
- New tokens needed (if any)

### Time estimate: 30 minutes

---

## Phase 1: TypeScript Component (2h)

### Goals
- Create standalone component with clean API
- Support input signals, output, and scroll tracking

### Checklist
- [ ] Create `timeline-scrollbar.ts` with:
  - `steps = input.required<TimelineStep[]>()`
  - `scrollTarget = input<HTMLElement | null>(null)`
  - `stepSelected = output<number>()`
  - `activeIndex = signal(0)`
  - `@ViewChild` for container reference
- [ ] `TimelineStep` interface with `id`, `title`, `description`
- [ ] `IntersectionObserver` instead of percentage-based scroll:
  - Observer for each step with `rootMargin: '-40% 0px -40% 0px'` (page center)
  - threshold: `0` (enough for any part to be visible at center)
  - cleanup in `ngOnDestroy`
- [ ] `scrollToStep(index)` with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [ ] `selectStep(index)` that emits output
- [ ] RTL-aware positioning with `dir="auto"` or `getComputedStyle`
- [ ] Change detection: `ChangeDetectionStrategy.Eager` (preserves project baseline behavior)
- [ ] accessibility: `role="navigation"`, `aria-label="Section navigation"`
- [ ] Each step: `role="button"`, `tabindex="0"`, `aria-label`
- [ ] keyboard support: `Enter`/`Space` for click, `ArrowUp`/`ArrowDown` for navigation

### Files
- `frontend/src/app/components/shared/timeline-scrollbar/timeline-scrollbar.ts`

### Time estimate: 2 hours

---

## Phase 2: HTML Template (1h)

### Goals
- Clean template with modern control flow
- RTL-first layout

### Checklist
- [ ] `@for` with `track step.id` and `let i = $index`
- [ ] `.dash` element with `[class.active]="i === activeIndex()"`
- [ ] `(click)="selectStep(i)"` + `(keydown)="onKeydown($event, i)"`
- [ ] tooltip with `role="tooltip"` + `aria-describedby`
- [ ] `@if` for tooltip visibility (no extra div)
- [ ] RTL: `inset-inline-start` instead of `left/right`
- [ ] no inline styles — CSS classes only

### Files
- `frontend/src/app/components/shared/timeline-scrollbar/timeline-scrollbar.html`

### Time estimate: 1 hour

---

## Phase 3: CSS Design System Integration (2h)

### Goals
- Full styling with project tokens
- Integration with existing design language
- RTL-first, responsive, accessible

### Checklist
- [ ] **Zero hardcoded values** — only `var(--token)`:
  - Colors: `--color-text-primary`, `--color-text-secondary`, `--color-border`, `--color-surface`, `--color-primary`
  - Sizes: `--space-*`, `--radius-*`, `--font-size-*`
  - Transitions: `--transition-fast`, `--transition-standard`
- [ ] **Layout**:
  - `:host { display: block; height: 100%; }`
  - container: `position: sticky; top: 0;` (not absolute!)
  - container width: `var(--space-12)` (24px)
  - container bg: `transparent` (no hardcoded!)
- [ ] **Dash styling**:
  - inactive: `height: 2px`, `width: var(--space-4)`, `background: var(--color-border)`, `border-radius: var(--radius-xs)`
  - hover: `width: var(--space-5)`, `background: var(--color-text-secondary)`
  - active: `width: var(--space-6)`, `height: 3px`, `background: var(--color-primary)`, `box-shadow: 0 0 8px var(--color-primary-glow)`
  - transition: `all var(--transition-fast)`
- [ ] **Tooltip styling** — MANDATORY glassmorphism pattern:
  - `.tooltip { position: relative; isolation: isolate; background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }`
  - `.tooltip::before { content: ''; position: absolute; inset: 0; border-radius: inherit; backdrop-filter: blur(var(--glass-blur)); -webkit-backdrop-filter: blur(var(--glass-blur)); z-index: -1; }`
  - `inset-inline-start: calc(100% + var(--space-2))` — RTL-first positioning
  - `top: 50%; transform: translateY(-50%)`
  - width: `var(--space-32)` (64px, NOT --space-64 which doesn't exist)
  - padding: `var(--space-4)`
  - border-radius: `var(--radius-md)`
  - opacity/visibility transition
- [ ] **Accessibility**:
  - `@media (prefers-reduced-motion: reduce)` — disable transitions
  - `@media (prefers-contrast: high)` — stronger borders/colors
  - focus-visible: `outline: 2px solid var(--color-primary)`, `outline-offset: 2px`
- [ ] **Responsive**:
  - `< 768px`: hide tooltip, dots slightly larger
  - `< 576px`: hide component entirely (use `--xs` breakpoint)
- [ ] **CSS Nesting**: all selectors nested under root selector (MANDATORY project pattern)
- [ ] **No `!important`** — not even one
- [ ] **RTL mirroring**: `inset-inline-start/end` instead of `left/right`, `margin-inline-*` instead of `margin-*`

### Files
- `frontend/src/app/components/shared/timeline-scrollbar/timeline-scrollbar.css`

### Time estimate: 2 hours

---

## Phase 4: Export + Registration (0.5h)

### Goals
- Component available for use in all pages

### Checklist
- [ ] Component is standalone — no module registration needed
- [ ] Export in shared barrel file (if exists)
- [ ] Verify import path is correct in consuming component
- [ ] Verify no circular dependency

### Files
- `frontend/src/app/components/shared/timeline-scrollbar/timeline-scrollbar.ts` (already created)

### Time estimate: 30 minutes

---

## Phase 5: Tests (1.5h)

### Goals
- Unit tests for logic
- RTL support verification
- Accessibility verification

### Checklist
- [ ] **Component creation**: component created successfully
- [ ] **Input validation**: steps required
- [ ] **Active index**: scroll updates active index
- [ ] **Step selection**: click emits output
- [ ] **Keyboard navigation**: ArrowUp/Down/Enter/Space
- [ ] **IntersectionObserver**: cleanup on destroy
- [ ] **RTL**: tooltip positioning in RTL
- [ ] **Accessibility**: aria attributes present

### Files
- `frontend/src/app/components/shared/timeline-scrollbar/timeline-scrollbar.spec.ts`

### Time estimate: 1.5 hours

---

## Phase 6: Documentation + Handoff (0.5h)

### Goals
- Update documents
- Session summary

### Checklist
- [ ] Update `documents/HANDOFF.md`
- [ ] Update `documents/STATUS.md`
- [ ] Update `documents/architecture-diagram.md` (if component affects architecture)
- [ ] Note which pages use the component (if relevant)

### Files
- `documents/HANDOFF.md`
- `documents/STATUS.md`

### Time estimate: 30 minutes

---

## Total Time Summary

| Phase | Description | Time |
|-------|-------------|------|
| 0 | Research & Preparation | 0.5h |
| 1 | TypeScript Component | 2h |
| 2 | HTML Template | 1h |
| 3 | CSS Design System | 2h |
| 4 | Export + Registration | 0.5h |
| 5 | Tests | 1.5h |
| 6 | Documentation | 0.5h |
| **Total** | | **8 hours** |

---

## Open Decisions (before starting implementation)

| Question | Option A | Option B | Note |
|----------|----------|----------|------|
| **Location** | `components/shared/` | `features/` specific | Generic vs dedicated |
| **First usage** | Chat history scroll | Other long page | Where to test first |
| **Container position** | sticky (stays in side) | absolute (follows scroll) | sticky recommended |
| **Tooltip direction** | Right (LTR) | Left (RTL) | RTL-first recommended |
| **Max steps** | Unlimited | max 10-15 | Logic for overflow |

---

## Recommended Implementation Phases (Subagent Split)

```
Agent 1 (Frontend): Phases 0-4 — Complete component
Agent 2 (Tester): Phase 5 — Tests
Agent 3 (Docs): Phase 6 — Documentation
```

**No backend agent needed** — component is 100% frontend.

---

## Success Criteria

1. ✅ `npx ng build` passes (run from `frontend/`)
2. ✅ `npx ng test --watch=false` passes (run from `frontend/`)
3. ✅ No hardcoded CSS values
4. ✅ RTL-first
5. ✅ Accessibility (keyboard, aria, reduced-motion)
6. ✅ Responsive
7. ✅ Glassmorphism consistent with project (MANDATORY `::before` pseudo-element pattern)
8. ✅ Documentation updated

---

## Critical Corrections from Original Plan

### File Naming (MANDATORY)
- ❌ `timeline-scrollbar.component.ts` 
- ✅ `timeline-scrollbar.ts`
- ❌ `timeline-scrollbar.component.html`
- ✅ `timeline-scrollbar.html`
- ❌ `timeline-scrollbar.component.css`
- ✅ `timeline-scrollbar.css`
- ❌ `timeline-scrollbar.component.spec.ts`
- ✅ `timeline-scrollbar.spec.ts`

### Class Naming (MANDATORY)
- ❌ `export class TimelineScrollbarComponent`
- ✅ `export class TimelineScrollbar`

### Token Corrections
- ❌ `var(--space-64)` — does NOT exist in `_variables.css`
- ✅ `var(--space-32)` — exists, equals 64px

### Change Detection Strategy
- ❌ `ChangeDetectionStrategy.OnPush`
- ✅ `ChangeDetectionStrategy.Eager` (preserves Angular 22 upgrade baseline)

### Verification Command
- ❌ `npx ng build frontend` (not supported)
- ✅ `npx ng build` (run from `frontend/` directory)

### Glassmorphism Pattern (MANDATORY)
- ❌ Direct `backdrop-filter` on content element
- ✅ Isolated `::before` pseudo-element with `z-index: -1` (see Phase 3 checklist)

### Template Control Flow
- ✅ Already correct: `@if`, `@for`, `@switch` (modern Angular 22)
- ❌ Never use: `*ngIf`, `*ngFor`, `*ngSwitch`

### Dependency Injection
- ✅ Already correct: `inject()` pattern
- ❌ Never use: constructor injection
