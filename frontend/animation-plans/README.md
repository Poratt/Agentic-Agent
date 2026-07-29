# Dashboard Animation Plans

Generated from `improve-animations` audit on commit `e79d798`.

## Plans

| # | Title | Severity | Status | Dependency |
|---|-------|----------|--------|------------|
| 001 | Add prefers-reduced-motion to pulse-dot | MEDIUM | DONE | — |
| 002 | Gate hover lift behind (hover: hover) media query | MEDIUM | DONE | — |
| 003 | Extract easing to shared --ease-out token | LOW | DONE | — |
| 004 | Add entrance fade to greeting header | LOW | DONE | 003 |
| 005 | Add crossfade on page-state transitions | LOW | DONE | 004 |

## Execution order

1. **003** (easing token) — foundational ✓
2. **001** (pulse reduced-motion) — independent ✓
3. **002** (hover touch gate) — independent ✓
4. **004** (greeting entrance) — depends on 003 ✓
5. **005** (page-state crossfade) — depends on 004 ✓
