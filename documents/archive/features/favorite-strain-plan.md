========================================
FILE: matching-engine-plan.md
========================================

# Architecture & Implementation Plan: Strain Hunter & Matching Engine

## Overview

This document outlines the complete architectural plan for refactoring the `Explorer` component into `StrainHunter`, and introducing the "Amsterdam Map / My Priorities" matching engine. The matching interface will be implemented as a fly-out panel (Drawer) injected directly into the `StrainHunter` component, maintaining context without requiring any new routes. The data pipeline will be entirely reactive using Angular Signals, and styling will strictly adhere to the established CSS token system.

---

## Phase 1: Refactoring Explorer to Strain Hunter

**Goal:** Rename the existing explorer feature to convey a more engaging, product-focused identity.

- [ ] **1.1 File Renaming:**
      Rename the directory `src/app/features/explorer` to `src/app/features/strain-hunter`.
      Rename files to `strain-hunter.ts`, `strain-hunter.html`, `strain-hunter.css`.
- [ ] **1.2 Component Refactoring:**
      Update the component class name to `StrainHunter` and selector to `app-strain-hunter`.
- [ ] **1.3 Routing Updates:**
      Update `app.routes.ts` to reflect the new path `strain-hunter` and the newly named component.
- [ ] **1.4 Navigation Updates:**
      Update `main-sidebar.html` to change the Explorer link path and label to "Strain Hunter".

---

## Phase 2: Core Matching Engine Service

**Goal:** Create a centralized, decoupled state machine to manage user preferences and calculate match scores.

- [ ] **2.1 Service Creation:**
      Create `src/app/core/services/matching-engine.service.ts`.
- [ ] **2.2 State Signals:**
      Define a `WritableSignal` for `prefs` (Record mapping ingredient strings to `'neutral' | 'like' | 'love' | 'avoid'`).
      Define a `WritableSignal` for `weights` (e.g., `{ terpene: 60, genetics: 40 }`).
- [ ] **2.3 Persistence Logic:**
      Implement `localStorage` initialization in the constructor and sync state mutations via Angular `effect()`.
- [ ] **2.4 Pure Calculation Algorithm:**
      Create a helper method `calculateScore(item: any): ScoredStrain` that:
  - Extracts terpenes and genetics (`originStrain`, `parent1`, `parent2`) from the raw item object.
  - Accumulates points based on state (`love`=2, `like`=1, `neutral`=0, `avoid`=0).
  - Flags `penalty: true` and logs the ingredient name if an `avoid` tag is detected.
  - Normalizes the score against max potential points, applies category weights, and deducts 30 points if a penalty is active.
  - Clamps the final integer between 0 and 100.

---

## Phase 3: Matching Preferences Drawer Component

**Goal:** Build the interactive sidebar UI using PrimeNG's Drawer, adhering strictly to global CSS variables.

- [ ] **3.1 Component Scaffold:**
      Create `matching-preferences-drawer.ts/html/css` as a Standalone component.
- [ ] **3.2 UI Layout & PrimeNG:**
      Wrap the template inside a `<p-drawer>` (or `<p-sidebar>` depending on PrimeNG version). Expose a two-way bound `visible` signal.
- [ ] **3.3 State Cycling Chips:**
      Render the Terpenes and Genetics grids. Clicking a chip cycles its state in the `MatchingEngineService`.
- [ ] **3.4 Semantic Styling (Strict Token Mapping):**
      Style the chips using pure CSS nesting under `:host`, targeting existing global variables:
  - `love`: `var(--color-success-bg)`, `var(--color-success)`
  - `like`: `var(--primary-30)`, `var(--color-primary)`
  - `avoid`: `var(--color-danger-bg)`, `var(--color-danger)`
  - `neutral`: `var(--color-surface)`, `var(--color-text-secondary)`
- [ ] **3.5 Weight Sliders:**
      Implement native `<input type="range">` elements bound to the weights signal.
- [ ] **3.6 Top 5 Micro-Preview:**
      Render a list at the bottom of the drawer subscribing to a computed signal of the top 5 scored strains, using inline styles for `width.%` on horizontal progress bars.

---

## Phase 4: Integrating the Engine into Strain Hunter

**Goal:** Connect the scoring engine output to the main datatable view and visualize the match scores.

- [ ] **4.1 UI Trigger Integration:**
      Add a "Personal Match" button in `strain-hunter.html` (header actions area) to toggle the Drawer visibility. Include the `<app-matching-preferences-drawer>` at the bottom of the template.
- [ ] **4.2 Data Pipeline Interception:**
      Update the `items` computed signal in `strain-hunter.ts`. After applying text filters, map the remaining items through `MatchingEngineService.calculateScore(item)`. Chain a `.sort((a, b) => b.score - a.score)` before returning the array.
- [ ] **4.3 SVG Ring Column:**
      Add a new column "Match Score" to the PrimeNG table.
      Render an inline `<svg>` ring where `stroke-dashoffset` is computed natively based on `(1 - score/100) * circumference`. Apply dynamic colors (success/primary/warning/danger variables) based on the score threshold.
- [ ] **4.4 Penalty Badges:**
      Update the main strain name cell. If `item.penalty === true`, display a micro-badge `⛔ [Ingredient]` directly below the name, using the `danger` design tokens.

---

I await your approval of this English-language, phase-by-phase implementation plan before writing any code.
