# Graph Report - frontend  (2026-07-15)

## Corpus Check
- 84 files · ~71,077 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 739 nodes · 1278 edges · 36 communities (23 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf7dd727`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ServiceResultContainer
- AiFormat
- StrainHunterSettings
- StrainHunter
- AuthStore
- ThemeService
- frontend
- Chat
- chat-message.ts
- LlmProvidersManagement
- render-host.component.ts
- ChatService
- MatchingPreferencesDrawer
- compilerOptions
- DatabaseMonitorSettings
- devDependencies
- dependencies
- strain-hunter.ts
- MatchingEngineStore
- matching-preferences-drawer.ts
- TerpeneStore
- Frontend
- TooltipDirective
- matching-engine.store.ts
- Dropdown
- scripts
- package.json
- enum-data.model.ts
- @angular/animations
- @angular/forms
- @phosphor-icons/web
- @primeuix/themes
- tslib
- environment.prod.ts
- mock.ts

## God Nodes (most connected - your core abstractions)
1. `StrainHunter` - 47 edges
2. `AiFormat` - 46 edges
3. `ServiceResultContainer` - 39 edges
4. `Chat` - 36 edges
5. `StrainHunterSettings` - 32 edges
6. `LlmProvidersManagement` - 24 edges
7. `AuthStore` - 22 edges
8. `MatchingPreferencesDrawer` - 21 edges
9. `MatchingEngineStore` - 17 edges
10. `ChatMessage` - 17 edges

## Surprising Connections (you probably didn't know these)
- `authGuard()` --indirect_call--> `AuthService`  [INFERRED]
  src/app/core/guards/auth.guard.ts → src/app/core/services/auth.service.ts
- `authGuard()` --indirect_call--> `AuthStore`  [INFERRED]
  src/app/core/guards/auth.guard.ts → src/app/core/store/auth.store.ts
- `authInterceptor()` --indirect_call--> `AuthService`  [INFERRED]
  src/app/core/interceptors/auth.interceptor.ts → src/app/core/services/auth.service.ts
- `authInterceptor()` --indirect_call--> `AuthStore`  [INFERRED]
  src/app/core/interceptors/auth.interceptor.ts → src/app/core/store/auth.store.ts
- `GroupedLlmProviderModel` --inherits--> `LlmModel`  [EXTRACTED]
  src/app/core/store/llm-provider.store.ts → src/app/core/services/llm-provider.service.ts

## Import Cycles
- None detected.

## Communities (36 total, 13 thin omitted)

### Community 0 - "ServiceResultContainer"
Cohesion: 0.06
Nodes (29): AccessToDirective, Directive, Input, BadgeColor, Directive, getUserRoleData(), UserRole, UserRoleOptions (+21 more)

### Community 1 - "AiFormat"
Cohesion: 0.07
Nodes (4): AiFormat, ComponentRenderParts, ProgressiveComponentParts, Directive

### Community 2 - "StrainHunterSettings"
Cohesion: 0.06
Nodes (8): confirmationDialogSettings(), IGenetics, GeneticsService, Injectable, GeneticsStore, Injectable, StrainHunterSettings, Component

### Community 4 - "AuthStore"
Cohesion: 0.07
Nodes (21): App, appConfig, initializeApp(), routes, Component, AppPrimeConfig, AppThemePreset, PRIMARY_PALETTE (+13 more)

### Community 5 - "ThemeService"
Cohesion: 0.07
Nodes (15): ThemeMode, ThemeService, Injectable, ColorGroupView, DesignSystem, PatternPreview, TokenCategory, TokenItem (+7 more)

### Community 6 - "frontend"
Cohesion: 0.05
Nodes (38): build, serve, test, builder, configurations, defaultConfiguration, options, packageManager (+30 more)

### Community 7 - "Chat"
Cohesion: 0.09
Nodes (6): ChatModelSelection, IChatMessage, Chat, Component, ChatMessageStreamState, ViewChild

### Community 8 - "chat-message.ts"
Cohesion: 0.08
Nodes (13): AutoScrollBottomDirective, Directive, Input, ChatStreamEvent, IChatStep, IRenderBlock, ChatDisplayStep, ChatMessage (+5 more)

### Community 9 - "LlmProvidersManagement"
Cohesion: 0.06
Nodes (7): LlmModel, GroupedLlmProviderModel, LlmProviderStore, Injectable, LlmModelView, LlmProvidersManagement, Component

### Community 10 - "render-host.component.ts"
Cohesion: 0.09
Nodes (19): CURRENCY_FLAG_MAP, CurrencyCardComponent, CurrencyRenderData, Component, DeleteConfirmCardComponent, DeleteConfirmRenderData, Component, ROLE_LABELS (+11 more)

### Community 11 - "ChatService"
Cohesion: 0.09
Nodes (7): IChatSession, ChatService, Injectable, ChatStore, Injectable, ChatHistory, Component

### Community 12 - "MatchingPreferencesDrawer"
Cohesion: 0.10
Nodes (3): ScoredStrain, MatchingPreferencesDrawer, Component

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (20): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, typeCheckHostBindings, compileOnSave, compilerOptions (+12 more)

### Community 14 - "DatabaseMonitorSettings"
Cohesion: 0.15
Nodes (8): DatabaseMonitorService, DatabaseStorageSummary, DatabaseTableStorage, Injectable, DatabaseMonitorSettings, Component, Settings, Component

### Community 15 - "devDependencies"
Cohesion: 0.13
Nodes (15): @angular/build, @angular/compiler-cli, jsdom, devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, jsdom (+7 more)

### Community 16 - "dependencies"
Cohesion: 0.13
Nodes (15): @angular/common, @angular/compiler, @angular/core, @angular/platform-browser, @angular/router, dependencies, @angular/common, @angular/compiler (+7 more)

### Community 17 - "strain-hunter.ts"
Cohesion: 0.16
Nodes (11): ScoreTooltip, Component, ScoreBreakdown, FILTER_FIELD_NAMES, ScoreTooltipPos, StrainHunterFilter, StrainHunterFilterField, StrainHunterResponse (+3 more)

### Community 19 - "matching-preferences-drawer.ts"
Cohesion: 0.28
Nodes (6): Tooltip, TooltipCategory, Component, CategoryGroup, PreviewItem, TooltipPos

### Community 21 - "Frontend"
Cohesion: 0.25
Nodes (7): Additional Resources, Building, Code scaffolding, Development server, Frontend, Running end-to-end tests, Running unit tests

### Community 23 - "matching-engine.store.ts"
Cohesion: 0.25
Nodes (6): DEFAULT_WEIGHTS, PersistedShape, PREF_STATES, PrefMap, PrefState, Weights

### Community 25 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, ng, start, test, watch

### Community 26 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

## Knowledge Gaps
- **115 isolated node(s):** `$schema`, `version`, `packageManager`, `newProjectRoot`, `projectType` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AiFormat` connect `AiFormat` to `chat-message.ts`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `StrainHunter` connect `StrainHunter` to `strain-hunter.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `environment` connect `ServiceResultContainer` to `StrainHunterSettings`, `AuthStore`, `ChatService`, `DatabaseMonitorSettings`, `strain-hunter.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `packageManager` to the rest of the system?**
  _115 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ServiceResultContainer` be split into smaller, more focused modules?**
  _Cohesion score 0.05938375350140056 - nodes in this community are weakly interconnected._
- **Should `AiFormat` be split into smaller, more focused modules?**
  _Cohesion score 0.07012987012987013 - nodes in this community are weakly interconnected._
- **Should `StrainHunterSettings` be split into smaller, more focused modules?**
  _Cohesion score 0.06219426974143955 - nodes in this community are weakly interconnected._