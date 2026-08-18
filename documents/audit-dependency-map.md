# Backend Dependency Map & Dead-Code Audit

**Date:** 2026-08-17 · **Scope:** `backend/src` — 15 feature modules + core, non-spec TS files, file-level relative-import graph (script: resolves every `from './…'`, aggregates to module level, DFS cycle detection, symbol-reference scan).

## 1. Cross-module dependency edges (A imports from B)

```
admin-agent   -> auth, google-calendar, llm, mcp-bridge, users, core
analytics     -> admin-agent, users, core
auth          -> users (entities/DTOs), core
genetics      -> cannlytics, llm, web-search, core
google-calendar -> core
ideas         -> llm, llm-provider, users, web-search, core
llm           -> llm-provider, core
llm-provider  -> admin-agent (decorator only), core
strain-hunter -> genetics, terpene, core
system        -> admin-agent, users, core
terpene       -> llm, web-search, core
users         -> auth (module), admin-agent (decorator only), core
web-search    -> core
core          -> genetics/terpene/users/llm-provider (SEED FILES ONLY)
root (app.module) -> all feature modules
```

Hub modules (imported by 3+): **core** (by all), **users** (admin-agent, analytics, auth, ideas, system), **llm** (admin-agent, genetics, ideas, terpene), **web-search** (genetics, ideas, terpene), **admin-agent** (analytics, llm-provider*, system — *decorator-only).

## 2. Cycles — 11 detected at graph level, ZERO at runtime DI level

Every detected cycle dissolves into type-level imports (entities, DTOs, decorators, seeds):

| Graph cycle | Actual edges | Verdict |
|---|---|---|
| core↔genetics/terpene/users/llm-provider | `core/seeds/*.seed.ts` import feature **entities** | bootstrap-only, benign — but architecturally core should not reach into features |
| llm→llm-provider→admin-agent→llm | llm-provider imports only `RequiresConfirmation` **decorator** from admin-agent | type-level, no DI cycle |
| admin-agent↔users | admin-agent.module imports UsersModule (one direction); users.controller imports admin-agent decorator | no runtime cycle |
| users↔auth | users.module imports AuthModule (one direction); auth imports User entity + DTOs only | no runtime cycle |

**No `forwardRef` needed anywhere — confirmed: zero `forwardRef` hits in the codebase.**

### Architectural smell (not a bug)
1. `RequiresConfirmation` decorator lives in `admin-agent/decorators/` but is consumed by `llm-provider` and `users` controllers — a cross-cutting concern owned by a feature module. Suggest relocating to `core/decorators/`.
2. Seed files in `core/seeds/` import feature entities — acceptable pragmatism, but it inverts the core→feature boundary. Alternative: move seeds next to their modules.

## 3. Isolated modules / unused services

- **Modules never imported by another module:** none — every module is wired (via app.module at minimum).
- **@Injectable services never referenced outside their own file:** none — all 25+ services are injected somewhere.

## 4. Dead exports (never referenced outside own file, specs excluded)

| Symbol | File | Status | Recommendation |
|---|---|---|---|
| `cosineSimilarity` | `core/utils/math.utils.ts` | **whole file dead** — sole export, zero callers anywhere | delete file |
| `getUserRoleData`, `UserRoleOptions`, `UserRoleDescription` | `core/enums/user-role.enum.ts` | backend copy unused; **frontend has its own used copy** (`frontend/.../user-role.enum.ts`) | remove from backend enum or keep as documented API mirror |
| `MCP_SERVERS` | `modules/mcp-bridge/mcp-bridge.config.ts` | used only inside own file | drop `export` keyword |
| `SYSTEM_CONTEXT_BASE` | `modules/admin-agent/constants/system-context.constant.ts` | used only inside own file | drop `export` keyword |
| `MAX_LLM_HISTORY_MESSAGES` | `modules/admin-agent/services/agent-session.service.ts` | used only inside own file | drop `export` keyword |
| `DARK_BG`, `LIGHT_BG`, `MIN_CONTRAST_RATIO`, `hexToRgb`, `rgbToHex`, `hexToHsl`, `hslToHex`, `contrastRatio`, `adjustLightnessForContrast` | `core/utils/color-contrast.util.ts` | internal helpers of the (used) `deriveThemeColors` | drop `export` keywords — code itself is alive |

## 5. Cross-repo finding (from stage 1)

- `frontend/tsconfig.spec.new.json` — tracked in git, `vitest/globals` types, excludes ~10 spec dirs. **CONFIRMED DEAD (2026-08-18)** — tests run on vitest via `@angular/build:unit-test` (`frontend/angular.json` → builder, no explicit `tsConfig` → builder defaults to `tsconfig.spec.json` per `node_modules/@angular/build/src/builders/unit-test/options.js`; external `vitest.config.ts` is loaded as base config). Zero references to `spec.new` anywhere in the repo. **Removed 2026-08-18.**

## 6. Summary

- Runtime health: clean — no DI cycles, no orphan modules, no orphan services.
- Hygiene debt: 1 dead file, ~16 over-exported/dead symbols, 1 dead tsconfig, 1 misplaced decorator, seeds reaching out of core.
- **Cleanup applied 2026-08-17 (user-approved):** `math.utils.ts` deleted; `getUserRoleData`/`UserRoleOptions`/`UserRoleDescription` removed from backend enum; 12 internal symbols un-exported (color-contrast×9, MCP_SERVERS, SYSTEM_CONTEXT_BASE, MAX_LLM_HISTORY_MESSAGES). **Also done since:** decorator relocated to `core/decorators/` (session y), seeds relocated to feature modules (session ac), `tsconfig.spec.new.json` removed 2026-08-18 (verified dead — see §5). **Nothing left.**
