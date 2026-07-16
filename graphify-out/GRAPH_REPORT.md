# Graph Report - .  (2026-07-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2125 nodes · 4200 edges · 150 communities (93 shown, 57 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf7dd727`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AgentToolExecutorService
- analytics.service.ts
- render-spec.service.ts
- currency.controller.ts
- AiFormat
- users.store.ts
- llm.types.ts
- StrainHunter
- MatchingPreferencesDrawer
- strain-hunter.ts
- frontend
- AuthStore
- LlmModelEntity
- environment.ts
- admin-agent.controller.ts
- database-monitor.service.ts
- StrainHunterService
- app.module.ts
- TerpeneController
- .update
- users.controller.ts
- ChatSession
- StrainHunterSettings
- ServiceResultContainer
- admin-agent.service.ts
- Chat
- .updateRole
- ThemeService
- auth.controller.ts
- .logout
- GeneticsService
- system.service.ts
- chat.ts
- AdminAgentService
- LlmProviderService
- User
- dependencies
- ServiceResultContainer
- LlmProvidersManagement
- compilerOptions
- UserRole
- llm-provider.service.ts
- .search
- DatabaseMonitorSettings
- ChatStore
- chat-message.ts
- terpene.service.ts
- compilerOptions
- devDependencies
- dependencies
- admin.guard.ts
- jwt-auth.guard.ts
- .fetchData
- .getForecast
- ChatMessage
- auth.service.ts
- genetics.service.ts
- genetics.controller.ts
- TerpeneService
- WeatherService
- jest
- scripts
- CannlyticsService
- web-search.service.ts
- weather.service.ts
- header.ts
- LlmController
- strain-hunter.service.ts
- ChatService
- GeneticsCreateDto
- genetics.seed.ts
- TerpeneCreateDto
- Terpene
- IChatMessage
- color-contrast.util.ts
- AgentRequestDto
- terpene.controller.ts
- app.controller.ts
- CreateLlmModelDto
- AutoScrollBottomDirective
- exclude
- package.json
- devDependencies
- LlmTasksService
- Dropdown
- scripts
- App
- nest-cli.json
- AppSetting
- strain-hunter-fetch-response.dto.ts
- package.json
- enrich-genetics.dto.ts
- enrich-terpene.dto.ts
- delete-user-result-response.dto.ts
- dependencies
- LlmProviderDto
- ollama.types.ts
- graphify.js
- @angular/animations
- @angular/router
- cookie-parser
- @nestjs/axios
- @nestjs/common
- @nestjs/config
- @nestjs/core
- @nestjs/passport
- @nestjs/schedule
- @nestjs/swagger
- openai
- passport
- reflect-metadata
- typeorm
- zod
- @eslint/eslintrc
- @eslint/js
- eslint-plugin-prettier
- globals
- jest
- @nestjs/cli
- @nestjs/schematics
- @nestjs/testing
- prettier
- source-map-support
- supertest
- ts-jest
- ts-loader
- ts-node
- tsconfig-paths
- @types/bcrypt
- @types/cookie-parser
- @types/jest
- @types/node
- @types/passport-jwt
- @types/supertest
- typescript
- typescript-eslint
- chat-history-item.interface.ts
- bash-security-block.sh
- post-edit-format.sh
- pre-write-warn.sh
- stop-reminder.sh
- @phosphor-icons/web
- primeng
- tslib
- environment.prod.ts
- mock.ts

## God Nodes (most connected - your core abstractions)
1. `ServiceResultContainer` - 62 edges
2. `StrainHunter` - 47 edges
3. `AiFormat` - 46 edges
4. `ServiceResultContainer` - 39 edges
5. `StrainHunterService` - 37 edges
6. `Chat` - 36 edges
7. `LlmModelEntity` - 33 edges
8. `StrainHunterSettings` - 32 edges
9. `User` - 31 edges
10. `AdminAgentService` - 30 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --indirect_call--> `AppModule`  [INFERRED]
  backend/src/main.ts → backend/src/app.module.ts
- `seedAdmin()` --indirect_call--> `User`  [INFERRED]
  backend/src/core/seeds/user.seed.ts → backend/src/modules/users/entities/user.entity.ts
- `seedGenetics()` --indirect_call--> `Genetics`  [INFERRED]
  backend/src/modules/genetics/seeds/genetics.seed.ts → backend/src/modules/genetics/entities/genetics.entity.ts
- `seedTerpenes()` --indirect_call--> `Terpene`  [INFERRED]
  backend/src/modules/terpene/seeds/terpene.seed.ts → backend/src/modules/terpene/entities/terpene.entity.ts
- `JwtPayload` --references--> `UserRole`  [EXTRACTED]
  backend/src/core/interfaces/jwt-payload.interface.ts → backend/src/core/enums/user-role.enum.ts

## Import Cycles
- None detected.

## Communities (150 total, 57 thin omitted)

### Community 0 - "AgentToolExecutorService"
Cohesion: 0.06
Nodes (35): ApiConsumes, ApiExtraModels, ApiResponse, RequestWithUser, AdminAgentController, ApiBearerAuth, ApiBody, ApiForbiddenResponse (+27 more)

### Community 1 - "analytics.service.ts"
Cohesion: 0.06
Nodes (43): AnalyticsController, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags (+35 more)

### Community 2 - "render-spec.service.ts"
Cohesion: 0.05
Nodes (50): AnalyticsChartRenderData, AnalyticsChartRenderDataSchema, AnalyticsChartRenderSpecSchema, ChatSessionsRenderData, ChatSessionsRenderDataSchema, ChatSessionsRenderSpecSchema, SessionCreatedRenderData, SessionCreatedRenderDataSchema (+42 more)

### Community 3 - "currency.controller.ts"
Cohesion: 0.06
Nodes (40): CurrencyController, ApiBadRequestResponse, ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags (+32 more)

### Community 4 - "AiFormat"
Cohesion: 0.07
Nodes (4): AiFormat, ComponentRenderParts, ProgressiveComponentParts, Directive

### Community 5 - "users.store.ts"
Cohesion: 0.08
Nodes (21): AccessToDirective, Directive, Input, BadgeColor, Directive, getUserRoleData(), UserRole, UserRoleOptions (+13 more)

### Community 6 - "llm.types.ts"
Cohesion: 0.11
Nodes (18): LlmService, Injectable, LlmClientService, Injectable, LlmHealthService, Injectable, LLM_PROVIDERS, LlmProviderConfigService (+10 more)

### Community 8 - "MatchingPreferencesDrawer"
Cohesion: 0.06
Nodes (11): DEFAULT_WEIGHTS, MatchingEngineStore, PersistedShape, PREF_STATES, PrefMap, PrefState, ScoredStrain, Injectable (+3 more)

### Community 9 - "strain-hunter.ts"
Cohesion: 0.07
Nodes (21): ScoreTooltip, Component, Tooltip, TooltipCategory, Component, TooltipDirective, Directive, GeneticsStore (+13 more)

### Community 10 - "frontend"
Cohesion: 0.05
Nodes (38): build, serve, test, builder, configurations, defaultConfiguration, options, cli (+30 more)

### Community 11 - "AuthStore"
Cohesion: 0.10
Nodes (16): routes, AppPrimeConfig, AppThemePreset, PRIMARY_PALETTE, PRIME_NG_PROVIDERS, authGuard(), authInterceptor(), UserForLogin (+8 more)

### Community 12 - "LlmModelEntity"
Cohesion: 0.10
Nodes (26): NVIDIA_MODELS, OPENROUTER_MODELS, seedLlmProviders(), AppDataSource, NVIDIA_MODELS, OPENROUTER_MODELS, seedDatabase(), seedAdmin() (+18 more)

### Community 13 - "environment.ts"
Cohesion: 0.13
Nodes (9): confirmationDialogSettings(), withCredentialsInterceptor(), IGenetics, ITerpene, GeneticsService, Injectable, TerpeneStore, Injectable (+1 more)

### Community 14 - "admin-agent.controller.ts"
Cohesion: 0.09
Nodes (20): AgentStreamEventDto, ApiProperty, ChatMessageResponseDto, ApiProperty, SessionResponseDto, ApiProperty, AgentActionAuditLog, AuditAction (+12 more)

### Community 15 - "database-monitor.service.ts"
Cohesion: 0.09
Nodes (21): DatabaseMonitorController, ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, Controller (+13 more)

### Community 16 - "StrainHunterService"
Cohesion: 0.15
Nodes (3): StrainHunterService, StrainItem, Injectable

### Community 17 - "app.module.ts"
Cohesion: 0.10
Nodes (24): AppModule, Module, AdminAgentModule, Module, AuthModule, Module, CannlyticsModule, Module (+16 more)

### Community 18 - "TerpeneController"
Cohesion: 0.17
Nodes (22): TerpeneController, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse (+14 more)

### Community 19 - ".update"
Cohesion: 0.17
Nodes (22): GeneticsController, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse (+14 more)

### Community 20 - "users.controller.ts"
Cohesion: 0.14
Nodes (14): ApiPropertyOptional, IsEmail, IsNotEmpty, IsOptional, IsString, UpdateUserDto, ApiProperty, UserResponseDto (+6 more)

### Community 21 - "ChatSession"
Cohesion: 0.09
Nodes (13): ChatSession, ApiProperty, Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn (+5 more)

### Community 23 - "ServiceResultContainer"
Cohesion: 0.20
Nodes (18): ServiceResultContainer, LlmProviderController, ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery (+10 more)

### Community 24 - "admin-agent.service.ts"
Cohesion: 0.10
Nodes (18): PARALLEL_UNSAFE_TOOL_NAMES, STEP_ICONS, ToolCallResult, buildSystemContext(), SYSTEM_CONTEXT, VISUAL_TRIGGER_KEYWORDS, ChatMessage, ApiProperty (+10 more)

### Community 25 - "Chat"
Cohesion: 0.12
Nodes (3): Chat, Component, ViewChild

### Community 26 - ".updateRole"
Cohesion: 0.19
Nodes (20): ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam (+12 more)

### Community 27 - "ThemeService"
Cohesion: 0.11
Nodes (10): initializeApp(), ThemeMode, ThemeService, Injectable, ColorGroupView, DesignSystem, PatternPreview, TokenCategory (+2 more)

### Community 28 - "auth.controller.ts"
Cohesion: 0.13
Nodes (10): JwtRefreshGuard, Injectable, JwtPayload, JwtAccessStrategy, Injectable, JwtRefreshStrategy, Injectable, LogoutPayloadDto (+2 more)

### Community 29 - ".logout"
Cohesion: 0.21
Nodes (20): AuthController, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse (+12 more)

### Community 30 - "GeneticsService"
Cohesion: 0.16
Nodes (9): Genetics, ApiProperty, Column, Entity, PrimaryGeneratedColumn, GeneticsService, Injectable, InjectRepository (+1 more)

### Community 31 - "system.service.ts"
Cohesion: 0.10
Nodes (17): SystemStatusDto, ApiProperty, SystemController, ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags (+9 more)

### Community 32 - "chat.ts"
Cohesion: 0.14
Nodes (8): LlmModel, LlmProvider, GroupedLlmProvider, GroupedLlmProviderModel, LlmProviderStore, Injectable, LlmModelView, LlmProviderView

### Community 33 - "AdminAgentService"
Cohesion: 0.23
Nodes (3): AdminAgentService, Injectable, LlmToolCall

### Community 34 - "LlmProviderService"
Cohesion: 0.10
Nodes (10): LlmModelTestResultEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, LlmProviderService (+2 more)

### Community 35 - "User"
Cohesion: 0.13
Nodes (12): ApiHideProperty, AuthService, Injectable, InjectRepository, ApiProperty, Column, CreateDateColumn, Entity (+4 more)

### Community 36 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, bcrypt, class-transformer, class-validator, mysql2, @nestjs/jwt, @nestjs/platform-express, @nestjs/typeorm (+13 more)

### Community 37 - "ServiceResultContainer"
Cohesion: 0.16
Nodes (5): ServiceResultContainer, LlmProviderService, Injectable, TerpeneService, Injectable

### Community 39 - "compilerOptions"
Cohesion: 0.10
Nodes (20): angularCompilerOptions, enableI18nLegacyMessageIdFormat, strictInjectionParameters, strictInputAccessModifiers, strictTemplates, typeCheckHostBindings, compileOnSave, compilerOptions (+12 more)

### Community 40 - "UserRole"
Cohesion: 0.16
Nodes (11): JwtPayloadResponseDto, ApiProperty, JwtPayloadResultResponseDto, ApiProperty, UserRole, UserRoleOptions, EnumData, Severity (+3 more)

### Community 41 - "llm-provider.service.ts"
Cohesion: 0.19
Nodes (11): RequiresConfirmation(), CreateLlmProviderDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsNotEmpty, IsOptional, IsString (+3 more)

### Community 42 - ".search"
Cohesion: 0.11
Nodes (16): ApiProperty, IsString, MaxLength, MinLength, WebSearchQueryDto, ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse (+8 more)

### Community 43 - "DatabaseMonitorSettings"
Cohesion: 0.15
Nodes (8): DatabaseMonitorService, DatabaseStorageSummary, DatabaseTableStorage, Injectable, DatabaseMonitorSettings, Component, Settings, Component

### Community 44 - "ChatStore"
Cohesion: 0.14
Nodes (4): ChatStore, Injectable, ChatHistory, Component

### Community 45 - "chat-message.ts"
Cohesion: 0.15
Nodes (10): ChatModelSelection, ChatStreamEvent, IChatStep, IRenderBlock, ChatDisplayStep, ChatMessageAction, ChatMessageRowState, RenderBlock (+2 more)

### Community 46 - "terpene.service.ts"
Cohesion: 0.15
Nodes (10): parseLlmJson(), buildTerpeneEnrichUserPrompt(), TerpeneUpdateDto, ApiPropertyOptional, IsArray, IsHexColor, IsOptional, IsString (+2 more)

### Community 47 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, module, outDir (+7 more)

### Community 48 - "devDependencies"
Cohesion: 0.13
Nodes (15): @angular/build, @angular/cli, @angular/compiler-cli, devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, jsdom (+7 more)

### Community 49 - "dependencies"
Cohesion: 0.13
Nodes (15): @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, dependencies, @angular/common, @angular/compiler (+7 more)

### Community 50 - "admin.guard.ts"
Cohesion: 0.20
Nodes (9): AppErrorCode, HEBREW_MESSAGES, looksLikeHebrew(), toHebrewUserMessage(), HttpExceptionFilter, HttpExceptionResponse, AdminGuard, Injectable (+1 more)

### Community 51 - "jwt-auth.guard.ts"
Cohesion: 0.31
Nodes (4): JwtAuthGuard, Injectable, CustomApiOperationOptions, GenUiSpec

### Community 52 - ".fetchData"
Cohesion: 0.13
Nodes (13): StrainHunterController, ApiBadRequestResponse, ApiBearerAuth, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags (+5 more)

### Community 53 - ".getForecast"
Cohesion: 0.21
Nodes (12): ApiProperty, IsNotEmpty, IsString, WeatherQueryDto, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiQuery (+4 more)

### Community 55 - "auth.service.ts"
Cohesion: 0.16
Nodes (11): LoginDto, ApiProperty, IsEmail, IsString, MinLength, RegisterDto, ApiProperty, IsEmail (+3 more)

### Community 56 - "genetics.service.ts"
Cohesion: 0.16
Nodes (9): buildGeneticsEnrichUserPrompt(), GeneticsUpdateDto, ApiPropertyOptional, IsHexColor, IsIn, IsOptional, IsString, MaxLength (+1 more)

### Community 57 - "genetics.controller.ts"
Cohesion: 0.29
Nodes (8): GeneticsDto, DTO_KEYS, toGeneticsDto(), ApiProperty, GeneticsListResultResponseDto, ApiProperty, GeneticsResultResponseDto, ApiProperty

### Community 59 - "WeatherService"
Cohesion: 0.19
Nodes (8): ApiBearerAuth, ApiTags, Controller, WeatherController, Module, WeatherModule, Injectable, WeatherService

### Community 60 - "jest"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 61 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 62 - "CannlyticsService"
Cohesion: 0.22
Nodes (4): CannlyticsListResponse, CannlyticsService, CannlyticsStrainData, Injectable

### Community 63 - "web-search.service.ts"
Cohesion: 0.19
Nodes (8): InjectRepository, ApiProperty, WebSearchResultDto, WebSearchResultItemDto, TavilyResponse, TavilyResult, Injectable, WebSearchService

### Community 64 - "weather.service.ts"
Cohesion: 0.23
Nodes (9): ApiProperty, WeatherCurrentDto, ApiProperty, WeatherForecastDayDto, ApiProperty, WeatherForecastDto, WttrCurrentCondition, WttrWeatherDescription (+1 more)

### Community 65 - "header.ts"
Cohesion: 0.17
Nodes (6): Header, Component, MainLayout, Component, MainSidebar, Component

### Community 66 - "LlmController"
Cohesion: 0.21
Nodes (9): LlmController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Delete, Param, Post (+1 more)

### Community 67 - "strain-hunter.service.ts"
Cohesion: 0.22
Nodes (7): Strain, Column, Entity, PrimaryGeneratedColumn, BrowserExtractedItem, JaneProductRecord, InjectRepository

### Community 68 - "ChatService"
Cohesion: 0.26
Nodes (3): IChatSession, ChatService, Injectable

### Community 69 - "GeneticsCreateDto"
Cohesion: 0.18
Nodes (10): GeneticsCreateDto, ApiProperty, ApiPropertyOptional, IsHexColor, IsIn, IsNotEmpty, IsOptional, IsString (+2 more)

### Community 70 - "genetics.seed.ts"
Cohesion: 0.29
Nodes (10): asString(), extractJsonBlock(), GeneticsSeed, loadRawRows(), normalizeRows(), RawGeneticsSeed, readPlanMarkdown(), seedGenetics() (+2 more)

### Community 71 - "TerpeneCreateDto"
Cohesion: 0.18
Nodes (10): TerpeneCreateDto, ApiProperty, ApiPropertyOptional, IsArray, IsHexColor, IsNotEmpty, IsOptional, IsString (+2 more)

### Community 72 - "Terpene"
Cohesion: 0.24
Nodes (8): Terpene, ApiProperty, Column, Entity, PrimaryGeneratedColumn, seedTerpenes(), TerpeneSeed, DTO_KEYS

### Community 73 - "IChatMessage"
Cohesion: 0.25
Nodes (3): IChatMessage, ChatMessageActionEvent, ChatMessageStreamState

### Community 74 - "color-contrast.util.ts"
Cohesion: 0.42
Nodes (9): adjustLightnessForContrast(), contrastRatio(), deriveThemeColors(), hexToHsl(), hexToRgb(), hslToHex(), relativeLuminance(), rgbToHex() (+1 more)

### Community 75 - "AgentRequestDto"
Cohesion: 0.20
Nodes (9): AgentRequestDto, LLM_PROVIDER_OPTIONS, ApiProperty, ApiPropertyOptional, IsNumber, IsOptional, IsString, Matches (+1 more)

### Community 76 - "terpene.controller.ts"
Cohesion: 0.40
Nodes (6): TerpeneDto, ApiProperty, TerpeneListResultResponseDto, ApiProperty, TerpeneResultResponseDto, ApiProperty

### Community 77 - "app.controller.ts"
Cohesion: 0.36
Nodes (5): AppController, ApiTags, Controller, AppService, Injectable

### Community 78 - "CreateLlmModelDto"
Cohesion: 0.22
Nodes (8): CreateLlmModelDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString

### Community 79 - "AutoScrollBottomDirective"
Cohesion: 0.33
Nodes (3): AutoScrollBottomDirective, Directive, Input

### Community 80 - "exclude"
Cohesion: 0.25
Nodes (7): exclude, extends, dist, node_modules, **/*spec.ts, test, ./tsconfig.json

### Community 81 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 82 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, eslint, eslint-config-prettier, @types/express, eslint, eslint-config-prettier, @types/express

### Community 83 - "LlmTasksService"
Cohesion: 0.38
Nodes (3): LlmTasksService, Injectable, Cron

### Community 85 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, ng, start, test, watch

### Community 86 - "App"
Cohesion: 0.47
Nodes (3): App, appConfig, Component

### Community 87 - "nest-cli.json"
Cohesion: 0.40
Nodes (4): collection, compilerOptions, $schema, sourceRoot

### Community 88 - "AppSetting"
Cohesion: 0.40
Nodes (4): AppSetting, ApiProperty, Entity, PrimaryGeneratedColumn

### Community 89 - "strain-hunter-fetch-response.dto.ts"
Cohesion: 0.60
Nodes (4): StrainDto, StrainHunterFetchResponseDto, StrainSymbolDto, ApiProperty

### Community 90 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 91 - "enrich-genetics.dto.ts"
Cohesion: 0.67
Nodes (3): EnrichGeneticsItemDto, EnrichGeneticsResponseDto, ApiProperty

### Community 92 - "enrich-terpene.dto.ts"
Cohesion: 0.67
Nodes (3): EnrichTerpeneItemDto, EnrichTerpeneResponseDto, ApiProperty

### Community 93 - "delete-user-result-response.dto.ts"
Cohesion: 0.67
Nodes (3): DeleteUserPayloadDto, DeleteUserResultResponseDto, ApiProperty

### Community 94 - "dependencies"
Cohesion: 0.50
Nodes (3): dependencies, @nestjs/schedule, @nestjs/schedule

## Knowledge Gaps
- **282 isolated node(s):** `bash-security-block.sh script`, `post-edit-format.sh script`, `pre-write-warn.sh script`, `stop-reminder.sh script`, `$schema` (+277 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ServiceResultContainer` connect `ServiceResultContainer` to `weather.service.ts`, `analytics.service.ts`, `LlmProviderService`, `User`, `currency.controller.ts`, `llm.types.ts`, `llm-provider.service.ts`, `LlmModelEntity`, `terpene.controller.ts`, `CreateLlmModelDto`, `database-monitor.service.ts`, `users.controller.ts`, `auth.service.ts`, `genetics.controller.ts`, `WeatherService`, `auth.controller.ts`, `web-search.service.ts`, `system.service.ts`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `StrainHunterService` connect `StrainHunterService` to `app.module.ts`, `strain-hunter.service.ts`, `jwt-auth.guard.ts`, `.fetchData`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `LlmModelEntity` connect `LlmModelEntity` to `llm-provider.service.ts`, `LlmProviderService`, `CreateLlmModelDto`, `ServiceResultContainer`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `bash-security-block.sh script`, `post-edit-format.sh script`, `pre-write-warn.sh script` to the rest of the system?**
  _282 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AgentToolExecutorService` be split into smaller, more focused modules?**
  _Cohesion score 0.05738615327656423 - nodes in this community are weakly interconnected._
- **Should `analytics.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06259780907668232 - nodes in this community are weakly interconnected._
- **Should `render-spec.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0523532522474881 - nodes in this community are weakly interconnected._