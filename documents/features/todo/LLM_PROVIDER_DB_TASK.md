# LLM Provider & Model DB — Full Implementation Task

## Resolved Decisions

| Decision             | Answer                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| Provider deletion    | Soft disable only (`active = false`). No hard delete in Phase 1, period.          |
| API key encryption   | **MANDATORY Phase 1.** AES-256-GCM. Key from `ENCRYPTION_KEY` env var.            |
| Ollama metadata rows | Only after admin explicitly saves/marks a model. Never auto-created.              |
| Default model scope  | Per-provider only. No global default.                                             |
| Model capabilities   | Manually configured by admin. No auto-probing.                                    |
| Quality scoring      | Response length + coherence heuristic until judge-model is ready.                 |
| Cron cadence         | Cloud: 6h. Ollama: 3h. Paid providers with rate-limit flag: auto-escalate to 12h. |

---

## Phase 1 — Entities & Encryption Utility

### 1a. Encryption utility

Create `backend/src/common/utils/encryption.util.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string, key: string): string {
  const iv = randomBytes(12);
  const keyBuf = Buffer.from(key, "hex");
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(encoded: string, key: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const keyBuf = Buffer.from(key, "hex");
  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

`ENCRYPTION_KEY` must be a 64-char hex string (32 bytes). Add to `.env`:

```
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 1b. LlmProvider entity

Create `backend/src/modules/llm/entities/llm-provider.entity.ts`:

```typescript
@Entity("llm_providers")
export class LlmProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  label: string;

  @Column()
  baseUrl: string;

  @Column({ nullable: true, select: false })
  apiKeyEncrypted: string | null;

  @Column({ nullable: true })
  defaultModelId: number | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => LlmModel, (m) => m.provider)
  models: LlmModel[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

Note: `apiKeyEncrypted` has `select: false` — never loaded unless explicitly selected with `addSelect`.

### 1c. LlmModel entity

Create `backend/src/modules/llm/entities/llm-model.entity.ts`:

```typescript
@Entity("llm_models")
@Unique(["providerId", "name"])
export class LlmModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  providerId: number;

  @ManyToOne(() => LlmProvider, (p) => p.models)
  @JoinColumn({ name: "providerId" })
  provider: LlmProvider;

  @Column()
  name: string;

  @Column()
  label: string;

  @Column({ default: true })
  active: boolean;

  @Column({ default: true })
  supportsStreaming: boolean;

  @Column({ default: false })
  supportsTools: boolean;

  @Column({ nullable: true })
  contextWindow: number | null;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: false })
  runtimeDiscovered: boolean;

  @Column({ nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1d. LlmModelTestRun entity

Create `backend/src/modules/llm/entities/llm-model-test-run.entity.ts`:

```typescript
@Entity("llm_model_test_runs")
export class LlmModelTestRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date | null;

  @Column({ type: "enum", enum: ["manual", "cron"] })
  trigger: "manual" | "cron";

  @Column({ type: "enum", enum: ["running", "completed", "failed"], default: "running" })
  status: "running" | "completed" | "failed";

  @Column({ default: 0 })
  totalModels: number;

  @Column({ default: 0 })
  testedModels: number;

  @Column({ default: 0 })
  failedModels: number;

  @OneToMany(() => LlmModelTestResult, (r) => r.run)
  results: LlmModelTestResult[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1e. LlmModelTestResult entity

Create `backend/src/modules/llm/entities/llm-model-test-result.entity.ts`:

```typescript
@Entity("llm_model_test_results")
@Index(["providerKey", "modelName", "testedAt"])
@Index(["runId"])
@Index(["modelId"])
export class LlmModelTestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  runId: number;

  @ManyToOne(() => LlmModelTestRun, (r) => r.results)
  @JoinColumn({ name: "runId" })
  run: LlmModelTestRun;

  @Column()
  providerId: number;

  @Column({ nullable: true })
  modelId: number | null;

  @Column()
  providerKey: string;

  @Column()
  modelName: string;

  @Column()
  modelLabel: string;

  @Column({ default: false })
  available: boolean;

  @Column({ default: false })
  success: boolean;

  @Column({ nullable: true, type: "text" })
  errorMessage: string | null;

  @Column({ nullable: true, type: "float" })
  latencyMs: number | null;

  @Column({ nullable: true, type: "float" })
  timeToFirstTokenMs: number | null;

  @Column({ nullable: true, type: "float" })
  tokensPerSecond: number | null;

  @Column({ nullable: true })
  inputTokens: number | null;

  @Column({ nullable: true })
  outputTokens: number | null;

  @Column({ nullable: true, type: "float" })
  qualityScore: number | null;

  @Column({ nullable: true, type: "text" })
  qualityReason: string | null;

  @Column()
  testedAt: Date;
}
```

### 1f. Register entities in llm.module.ts

Add all four entities to `TypeOrmModule.forFeature([...])` in `LlmModule`.

### Verification Phase 1

```bash
cd backend && npm.cmd run build
```

No new errors. Tables created on next app start via `synchronize: true`.

---

## Phase 2 — Repository Service

### 2a. LlmProviderRegistryService

Create `backend/src/modules/llm/services/llm-provider-registry.service.ts`.

Responsibilities:

- CRUD for providers and models
- API key encrypt/decrypt using `encryption.util.ts`
- Safe DTO mapping (never expose `apiKeyEncrypted`)
- Idempotency: use `existsBy` before any insert

Key methods:

```typescript
findAllProviders(): Promise<ProviderResponseDto[]>
findProviderById(id: number): Promise<ProviderResponseDto>
createProvider(dto: CreateProviderDto): Promise<ProviderResponseDto>
updateProvider(id: number, dto: UpdateProviderDto): Promise<ProviderResponseDto>
disableProvider(id: number): Promise<void>  // sets active=false, never deletes if history exists
findModelsByProvider(providerId: number): Promise<ModelResponseDto[]>
createModel(providerId: number, dto: CreateModelDto): Promise<ModelResponseDto>
updateModel(id: number, dto: UpdateModelDto): Promise<ModelResponseDto>
disableModel(id: number): Promise<void>
setDefaultModel(providerId: number, modelId: number): Promise<void>
getDecryptedApiKey(providerId: number): Promise<string | null>  // only for internal LLM client use
```

API key handling rules:

- `encrypt(plainKey, process.env.ENCRYPTION_KEY)` on save
- `decrypt(stored, process.env.ENCRYPTION_KEY)` only in `getDecryptedApiKey()`
- DTO mapping always sets `hasApiKey: !!provider.apiKeyEncrypted`, never the key itself
- On `updateProvider`: if `dto.apiKey` is empty/undefined → keep existing encrypted key unchanged

### 2b. Refactor LlmProviderConfigService

Update to resolve provider config from DB first, fall back to env:

```typescript
async getProviderConfig(key: string): Promise<ProviderConfig> {
  const dbProvider = await this.registry.findByKey(key);
  if (dbProvider?.active) {
    return {
      baseUrl: dbProvider.baseUrl,
      apiKey: await this.registry.getDecryptedApiKey(dbProvider.id),
    };
  }
  return this.getEnvFallback(key);
}
```

### 2c. Refactor LlmModelCatalogService

Update `getModelOptions()` to read from active DB models grouped by provider.
Keep Ollama as a special case: merge DB metadata with live `/api/tags` discovery.
Ollama models not in DB appear as `runtimeDiscovered: true, installed: true`.
Ollama models in DB but not in live tags appear as `installed: false, missing: true` — excluded from chat options.

Response shape stays identical to current Angular consumer:

```typescript
{
  label: string;
  items: {
    id: string;
    provider: string;
    value: string;
    label: string;
  }
  [];
}
[];
```

### Verification Phase 2

```bash
cd backend && npm.cmd run build
```

`GET /llm/model-options` still returns same shape.

---

## Phase 3 — Admin Controller

Add to `backend/src/modules/llm/llm.controller.ts` (or a new `llm-admin.controller.ts`):

All endpoints require `@UseGuards(JwtAuthGuard, AdminGuard)`.

### Providers

```
GET    /llm/admin/providers
POST   /llm/admin/providers
PATCH  /llm/admin/providers/:id
DELETE /llm/admin/providers/:id   → soft disable only
```

### Models

```
GET    /llm/admin/providers/:providerId/models
POST   /llm/admin/providers/:providerId/models
PATCH  /llm/admin/models/:id
DELETE /llm/admin/models/:id      → soft disable only
PATCH  /llm/admin/providers/:providerId/default-model/:modelId
```

### Test Runs

```
POST   /llm/admin/test-runs
GET    /llm/admin/test-runs
GET    /llm/admin/test-runs/:id/results
GET    /llm/admin/model-rankings
GET    /llm/admin/models/:id/test-history
GET    /llm/admin/runtime-models/ollama
```

### DTOs

Follow existing project DTO conventions (class-validator decorators, Swagger `@ApiProperty`).

`CreateProviderDto`:

```typescript
key: string        // @IsString() @IsNotEmpty()
label: string      // @IsString() @IsNotEmpty()
baseUrl: string    // @IsUrl()
apiKey?: string    // @IsOptional() @IsString()
active?: boolean   // @IsOptional() @IsBoolean()
```

`UpdateProviderDto`: all fields optional via `@IsOptional()`.
Empty `apiKey` = keep existing. Explicit string = overwrite.

`CreateModelDto`:

```typescript
name: string
label: string
active?: boolean
supportsStreaming?: boolean
supportsTools?: boolean
contextWindow?: number
sortOrder?: number
```

`UpdateModelDto`: all optional.

`StartTestRunDto`:

```typescript
providerIds?: number[]
modelIds?: number[]
trigger?: 'manual' | 'cron'   // default 'manual'
```

### Swagger

Add `@ApiTags('LLM Admin')` and `@ApiOperation` / `@ApiResponse` to every endpoint.
Regenerate `swagger-spec.json` after build.

### Verification Phase 3

```bash
cd backend && npm.cmd run build
```

---

## Phase 4 — Seed / Bootstrap

Create `backend/src/modules/llm/services/llm-provider-seed.service.ts`.

Implements `OnModuleInit`.

```typescript
async onModuleInit(): Promise<void> {
  await this.seedProviders();
  await this.seedModels();
}
```

`seedProviders()`:

- For each env-configured provider (openrouter, nvidia, ollama):
  - `existsBy({ key })` → skip if already exists
  - Insert with env values
  - Encrypt API key if present

`seedModels()`:

- For each entry in `LLM_STATIC_MODEL_GROUPS`:
  - Find provider by key
  - `existsBy({ providerId, name })` → skip if exists
  - Insert

Rules:

- Never update existing records — admin edits must survive restarts
- Log skipped records at debug level, new inserts at log level

Register as provider in `LlmModule`.

### Verification Phase 4

```bash
cd backend && npm.cmd run build
```

Fresh DB: providers and models seeded.
Existing DB: no overwrite of admin changes.

---

## Phase 5 — LLM Health Integration

Update `LlmHealthService.testAllModels()`:

- Load active models from DB via `LlmProviderRegistryService`
- Use `getDecryptedApiKey()` for provider auth
- Keep response shape identical

Update `LlmClientService`:

- Resolve provider config from DB via `LlmProviderConfigService`
- Fall back to env if DB record missing

### Verification Phase 5

```bash
cd backend && npm.cmd run build
```

`GET /llm/llm-test` and `GET /llm/test-all` still work.

---

## Phase 6 — Scheduled Test Runs & Ranking

### 6a. Install scheduler

```bash
cd backend && npm install @nestjs/schedule
```

Register `ScheduleModule.forRoot()` in `AppModule` or `LlmModule`.

### 6b. LlmModelTestRunnerService

Create `backend/src/modules/llm/services/llm-model-test-runner.service.ts`.

```typescript
async startRun(dto: StartTestRunDto): Promise<LlmModelTestRun>
async executeRun(run: LlmModelTestRun): Promise<void>
private testModel(provider: LlmProvider, model: LlmModel | OllamaRuntimeModel): Promise<LlmModelTestResult>
```

Concurrency: max 3 parallel model tests.
Per-model timeout: 30 seconds.
On timeout: persist as `available: false, success: false, errorMessage: 'timeout'`.

Guard against concurrent runs:

```typescript
const running = await this.runRepo.existsBy({ status: "running" });
if (running) throw new ConflictException("A test run is already in progress");
```

Quality score heuristic (until judge-model):

```typescript
function computeQualityScore(response: string): number {
  const length = response.trim().length;
  if (length < 20) return 0.1;
  if (length < 100) return 0.4;
  if (length < 500) return 0.7;
  return 0.9;
}
```

Store reason: `'heuristic:length'`.

### 6b. Cron schedule

```typescript
@Cron('0 */6 * * *')   // cloud providers
async runCloudCron(): Promise<void>

@Cron('0 */3 * * *')   // ollama
async runOllamaCron(): Promise<void>
```

Paid providers with rate limit flag (future): check `rateLimitFlag` on provider entity, skip if within 12h window.

### 6c. LlmModelRankingService

Create `backend/src/modules/llm/services/llm-model-ranking.service.ts`.

```typescript
async getRankings(): Promise<ModelRankingDto[]>
```

Query: last 10 results per model, compute:

```typescript
availabilityScore = successCount / totalCount; // 0-1
latencyScore = 1 - clamp(avgLatency / 10000, 0, 1); // lower=better
speedScore = clamp(avgTps / 50, 0, 1); // higher=better
qualityScore = avgQualityScore; // 0-1

overallScore =
  availabilityScore * 0.4 + latencyScore * 0.25 + speedScore * 0.25 + qualityScore * 0.1;
```

Sort by `overallScore` descending. Return `ModelRankingDto[]`.

### Verification Phase 6

```bash
cd backend && npm.cmd run build
```

`POST /llm/admin/test-runs` creates run + result rows.
`GET /llm/admin/model-rankings` returns sorted list.

---

## Phase 7 — Angular Service

Update `frontend/src/app/core/services/llm.service.ts`.

Keep existing methods unchanged:

```typescript
getModelOptions(): Observable<ModelOptionGroup[]>
getStatus(): Observable<LlmStatus>
```

Add admin methods:

```typescript
getAdminProviders(): Observable<ProviderResponseDto[]>
createProvider(dto: CreateProviderDto): Observable<ProviderResponseDto>
updateProvider(id: number, dto: UpdateProviderDto): Observable<ProviderResponseDto>
disableProvider(id: number): Observable<void>
getProviderModels(providerId: number): Observable<ModelResponseDto[]>
createModel(providerId: number, dto: CreateModelDto): Observable<ModelResponseDto>
updateModel(id: number, dto: UpdateModelDto): Observable<ModelResponseDto>
disableModel(id: number): Observable<void>
setDefaultModel(providerId: number, modelId: number): Observable<void>
startModelTestRun(dto: StartTestRunDto): Observable<TestRunDto>
getModelTestRuns(): Observable<TestRunDto[]>
getModelTestRunResults(runId: number): Observable<TestResultDto[]>
getModelRankings(): Observable<ModelRankingDto[]>
getOllamaRuntimeModels(): Observable<OllamaRuntimeModelDto[]>
```

Add interfaces to `frontend/src/app/core/models/llm.models.ts` (or equivalent models file).
Follow `ServiceResultContainer` pattern used in the rest of the project.

### Verification Phase 7

```bash
cd frontend && npx ng build
```

---

## Phase 8 — Settings Page State

Update `frontend/src/app/features/settings/settings.ts`:

```typescript
export class SettingsComponent implements OnInit {
  protected readonly PageStates = PageStates;

  private readonly llmService = inject(LlmService);

  providers = signal<ProviderResponseDto[]>([]);
  pageState = signal<PageStates>(PageStates.Loading);

  ngOnInit(): void {
    this.llmService.getAdminProviders().subscribe({
      next: (data) => {
        this.providers.set(data);
        this.pageState.set(data.length ? PageStates.Ready : PageStates.Empty);
      },
      error: () => this.pageState.set(PageStates.Error),
    });
  }
}
```

Template uses `@switch (pageState())` with Loading / Error / Empty / Ready cases.

### Verification Phase 8

```bash
cd frontend && npx ng build
```

---

## Phase 9 — Settings UI

Follow existing project conventions:

- Global button classes: `.primary-btn.filled`, `.danger-btn`, `.transparent-btn`
- Global form classes: `.form-group`, `.form`
- Global card class: `.card`
- No component-specific CSS unless unavoidable
- RTL layout, Hebrew labels
- `dir="ltr"` on: provider key, base URL, model name, API key field

### Provider list section

- Table or card list showing: label, key, baseUrl, active badge, hasApiKey indicator, defaultModel, modelsCount
- Actions: edit, disable, set default model
- Add provider button

### Provider form (inline or dialog)

- Fields: key (ltr), label, baseUrl (ltr), API key (write-only, placeholder "מוגדר" if exists), active toggle
- On edit: empty API key field = keep existing

### Model list per provider (expandable)

- label, name (ltr), active, streaming badge, tools badge, contextWindow, sortOrder
- For Ollama: installed/missing indicator
- Latest test: latency, availability, quality score
- Actions: edit, disable

### Model form

- Fields: name (ltr), label, active, supportsStreaming, supportsTools, contextWindow, sortOrder

### Rankings tab/section

- Table: provider, model, overallScore, availabilityScore, latencyScore, speedScore, qualityScore, sampleSize, lastTestedAt

### Test runs section

- Start test run button (disabled if run in progress)
- Latest run status + progress (testedModels / totalModels)
- Results table: provider, model, available, success, latency, tps, quality, error, testedAt

### Verification Phase 9

```bash
cd frontend && npx ng build
```

Manual browser check at `/settings`.

---

## Security Checklist

- [ ] `apiKeyEncrypted` has `select: false` on entity
- [ ] `getDecryptedApiKey()` only called internally, never in controller
- [ ] No DTO includes `apiKey`, `apiKeyEncrypted`, or any secret field
- [ ] `ENCRYPTION_KEY` present in `.env` and `.env.example` (with placeholder value)
- [ ] AdminGuard on all `/llm/admin/*` endpoints
- [ ] Concurrent run guard on `POST /llm/admin/test-runs`

## Final Build Verification

```bash
cd backend && npm.cmd run build
cd frontend && npx ng build
```

Zero new errors beyond pre-existing budget warnings.
