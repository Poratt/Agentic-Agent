# Design System: Porat Admin (Angular & PrimeNG Preset)

## 1. Platform & Architecture
- **Framework:** Angular 21 (Single Page Application) using Standalone Components and Signals.
- **Project Structure:** All components must be generated inside `frontend/src/app/features/` or `frontend/src/app/components/` as Angular Standalone Components. Never output static HTML files in the root.
- **Component Anatomy:** Each UI screen must consist of an Angular Component class (`.ts`), an inline or external template (`.html`), and styling. Use PrimeNG controls when applicable, mapped to our global CSS variables.

## 2. Dynamic Theme Engine (Dark / Light Mode)
- **Mechanism:** Theme switching is handled dynamically via the `[data-theme]` attribute on the `<html>` or `<body>` tag.
- **CSS Custom Properties:** **CRITICAL:** Do NOT hardcode colors (like `#0A0F1E`) in new components. Always reference the semantic CSS variables so the design adapts automatically between themes:
  - Background: `var(--color-bg)`
  - Background Gradient: `var(--color-bg-gradient)`
  - Surface Container: `var(--color-surface)`
  - Border/Divider: `var(--color-border)`
  - Input Background: `var(--color-input-bg)`
  - Primary Accent: `var(--color-primary)` (Electric Cyan in Dark, Deep Blue in Light)
  - Secondary Accent: `var(--color-secondary)` (Vivid Purple)
  - Text Primary: `var(--color-text-primary)`
  - Text Secondary: `var(--color-text-secondary)`

## 3. Aesthetic Spec & UI Guidelines

### Dark Theme Mode ("Luxury Glassmorphism")
- **Atmosphere:** Futuristic, high-tech command center. Deep dark background with subtle radial glows of Cyan (`var(--color-primary-glow)`) and Purple (`var(--color-secondary-glow)`).
- **Surfaces:** Glassmorphic card styling. Add class `.glass-effect` for containers which applies `background: var(--color-surface)` (semi-transparent white) and a high blur: `backdrop-filter: blur(20px)`.

### Light Theme Mode ("Sleek & Clean")
- **Atmosphere:** Highly legible, clean, professional administrative tool. 
- **Surfaces:** Soft gray background (`#F0F4F8`) with crisp white elevated cards, subtle borders, and soft shadows (`var(--shadow-soft)`).

### Typography Hierarchy
- **Font Family:** `'Heebo', 'Inter', sans-serif` (RTL alignment by default).
- **Scale:**
  - Huge Metric: `var(--font-size-huge)` (48px, Bold)
  - Page Title: `var(--font-size-xl)` (24px, Semibold)
  - Card/Section Header: `var(--font-size-lg)` (20px, Semibold)
  - Body Text: `var(--font-size-md)` (16px, Regular)
  - Small / Caption: `var(--font-size-sm)` (14px, Medium)
  - Badges / Micro: `var(--font-size-xs)` (12px, Medium)

### Layout & Spacing
- **Layout Shell:** Main layout utilizes `app-main-layout` with a sidebar (`app-main-sidebar` - 280px wide) and a flex-grow main content area (`.main-content` / `.page-content`) with `padding: var(--space-8)`.
- **Spacing Unit:** 4px base (`var(--space-1)` = 4px, `var(--space-2)` = 8px, `var(--space-3)` = 12px, `var(--space-4)` = 16px, `var(--space-6)` = 24px, `var(--space-8)` = 32px).
- **Border Radius:** Soft corners. Small (`8px` - `var(--radius-sm)`), Medium (`12px`), Large (`16px` - `var(--radius-lg)`).

### Built-in Interactive Specs
- **Primary Gradient Buttons:** `.btn-primary` (Gradient Cyan to Blue, with translateY hover animations and primary glow shadow).
- **Danger Buttons:** `.btn-danger` (Red outline/background, shifts to solid red on hover).
- **Ghost Buttons:** `.btn-ghost` (Transparent background, outlines border and shifts text color on hover).
- **Form Fields:** `input`, `textarea`, `select` must use `var(--color-input-bg)`, solid border, and outline-glow on `:focus`.
- **Global Badges:** `.badge` component with dynamic background using custom directive `[badgeColor]`. Uses semantic icons (`.ph`).
- **Real-Time Status Indicators:** `.status-indicator` containing a pulsing green dot (`.pulse-dot`) to represent API connectivity and system health.
