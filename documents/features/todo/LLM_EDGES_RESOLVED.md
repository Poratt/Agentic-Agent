# LLM Provider DB 9 Open Edges Resolved

## 1. Global Default vs Per-Provider Default

**Decision:** Hybrid approach.

- **DB models:** per-provider default only (no global in DB).
- **Bootstrap fallback:** `AI_PROVIDER` env var defines **bootstrap provider** (not model).
- **Request time:** chat request must specify `{ provider?, model? }`. If both missing, use bootstrap provider's default model.

**Implementation:**

- `LlmProviderConfigService.getBootstrapProvider(): string` resolves `AI_PROVIDER` env or first active provider in DB.
- `LlmClientService.getDefaultModel(provider?: string)` async, returns provider's `defaultModelId` or null.
- Chat route: `POST /chat` requires either explicit `provider` or falls back to bootstrap provider, then uses its default model.
- `getStatus()` always returns bootstrap provider's current model.
- `getRuntimeSelection()` returns bootstrap provider + default model pair.

This preserves existing behavior while enabling per-provider defaults in DB.

---

## 2. Provider Type Hardcoded vs String

**Decision:** `provider: string` from DB, hardcoded enum for routing/client logic.

Rationale:

- DB stores `provider.key: string` (e.g., `'openrouter'`, `'nvidia'`, `'ollama'`).
- Frontend displays `provider.label: string` (user-facing).
- Client resolution logic uses `ProviderType enum` (internal routing).

**Implementation:**

```typescript
// backend/src/modules/llm/types/provider-type.enum.ts
export enum ProviderType {
  OPENROUTER = 'openrouter',
  NVIDIA = 'nvidia',
  OLLAMA = 'ollama',
  OLLAMA_CLOUD = 'ollama-cloud',
}

// In LlmProvider entity:
@Column()
key: string;  // but must match ProviderType value

// In ProviderRegistryService:
createProvider(dto: CreateProviderDto): Promise<ProviderResponseDto> {
  if (!Object.values(ProviderType).includes(dto.key)) {
    throw new BadRequestException(`Unknown provider: ${dto.key}`);
  }
  // ...
}
```

Phase 1 only supports the 4 enum values. Adding new provider types requires code change (okay for now, not a limitation).

---

## 3. `ollama-cloud` Handling

**Decision:** `ollama-cloud` is a virtual provider, read-only, never created via CRUD.

Ollama models are discovered from `/api/tags`. Some tagged as `cloud` (multi-user).

**Implementation:**

```typescript
// In ProviderType enum: include for routing/read purposes
export enum ProviderType {
  OPENROUTER = 'openrouter',
  NVIDIA = 'nvidia',
  OLLAMA = 'ollama',
  OLLAMA_CLOUD = 'ollama-cloud',  // routing only
}

// In ProviderRegistryService.createProvider(): BLOCK ollama-cloud
createProvider(dto: CreateProviderDto): Promise<ProviderResponseDto> {
  if (dto.key === ProviderType.OLLAMA_CLOUD) {
    throw new BadRequestException('ollama-cloud is auto-computed, cannot be manually created');
  }
  if (!Object.values(ProviderType).includes(dto.key)) {
    throw new BadRequestException(`Unknown provider: ${dto.key}`);
  }
  // ...
}

// In LlmModelCatalogService.getModelOptions():
const ollamaModels = await this.discoverOllamaModels();
const ollamaCloudModels = ollamaModels.filter(m => m.isCloud);

// Return structure preserves existing behavior:
[
  { label: 'ollama', items: [ ...localOllama ] },
  { label: 'ollama-cloud', items: [ ...cloud ] },
  { label: 'openrouter', items: [ ...fromDb ] },
]
```

`ollama-cloud` is never written to DB. It's computed at read time from Ollama discovery + metadata. Admin cannot create it via `POST /llm/admin/providers`.

---

## 4. Provider & Model Deletion

**Decision:** DELETE always performs soft disable. No hard delete in Phase 1.

```typescript
// In ProviderRegistryService:
async disableProvider(id: number): Promise<void> {
  await this.providerRepo.update(id, { active: false });
}

// No deleteProvider() method at all.

// In LlmModule controller:
@Delete('/llm/admin/providers/:id')
async deleteProvider(@Param('id') id: number): Promise<void> {
  // Disable, never hard-delete
  return this.registry.disableProvider(id);
}

// Same for models:
async disableModel(id: number): Promise<void> {
  await this.modelRepo.update(id, { active: false });
}
```

`DELETE /llm/admin/providers/:id` sets `active = false`.
`DELETE /llm/admin/models/:id` sets `active = false`.

No hard delete. Ever. This preserves test history for ranking/analysis and prevents accidental data loss.

**Decision:** Add `rateLimitFlag: boolean` to `LlmProvider` entity in Phase 1.

Default: `false`. Admin can set `true` for paid providers.

**Implementation:**

```typescript
// In LlmProvider entity:
@Column({ default: false })
rateLimitFlag: boolean;

// In cron schedule (Phase 6):
async runCron(): Promise<void> {
  const providers = await this.providerRepo.find({ where: { active: true } });
  for (const p of providers) {
    const interval = p.rateLimitFlag ? '0 */12 * * *' : '0 */6 * * *';
    // Note: NestJS @Cron is fixed per-method, so split into two methods:
    // runStandardCron() - every 6h
    // runRateLimitedCron() - every 12h
    // Filter providers in each by rateLimitFlag
  }
}
```

DTO includes `rateLimitFlag` in response (safe to expose).

---

## 5. Encryption Key Validation Fail Fast

**Decision:** Fail-fast in `LlmModule.onModuleInit()` if `ENCRYPTION_KEY` is missing or invalid.

**Implementation:**

```typescript
// backend/src/modules/llm/services/encryption.service.ts
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const keyEnv = process.env.ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new Error(
        "ENCRYPTION_KEY env var is required for LLM provider API key encryption. " +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    if (!/^[a-f0-9]{64}$/.test(keyEnv)) {
      throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
    }
    this.key = Buffer.from(keyEnv, "hex");
  }

  encrypt(text: string): string {
    /* ... */
  }
  decrypt(encrypted: string): string {
    /* ... */
  }
}

// In LlmModule:
@Module({
  imports: [TypeOrmModule.forFeature([...entities]), ScheduleModule.forRoot()],
  providers: [
    EncryptionService, //  initialized before any other service
    LlmProviderRegistryService,
    LlmProviderConfigService,
    // ...
  ],
})
export class LlmModule {}
```

App fails on startup if key is invalid. No silent fallback.

---

## 6. `backend/.env.example`

**Decision:** Create `backend/.env.example` with all required and optional LLM vars.

**File:** `backend/.env.example`

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/agentic-admin

# JWT
JWT_SECRET=<change-me>

# LLM  Bootstrap provider (per-provider defaults are in DB)
AI_PROVIDER=openrouter

# LLM  OpenRouter
OPENROUTER_API_KEY=sk-or-v1-<key>

# LLM  NVIDIA
NVIDIA_API_KEY=<key>

# LLM  Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434

# LLM  Encryption (MANDATORY)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<generate-with-command-above>
```

Update `.gitignore` to ignore `backend/.env` (not `.env.example`).

---

## 7. Async Config Resolution Caching Strategy

**Decision:** Use application bootstrap cache + per-request fallback.

`getProviderConfig()` becomes async. To avoid multiple DB calls and async bottlenecks:

**Implementation:**

```typescript
// backend/src/modules/llm/services/llm-provider-config.service.ts
@Injectable()
export class LlmProviderConfigService {
  private providerConfigCache = new Map<string, ProviderConfig>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getProviderConfig(key: string): Promise<ProviderConfig> {
    const cached = this.providerConfigCache.get(key);
    if (cached && (this.cacheExpiry.get(key) || 0) > Date.now()) {
      return cached;
    }

    const config = await this.resolveConfig(key);
    this.providerConfigCache.set(key, config);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
    return config;
  }

  private async resolveConfig(key: string): Promise<ProviderConfig> {
    const dbProvider = await this.registry.findByKey(key);
    if (dbProvider?.active) {
      return {
        baseUrl: dbProvider.baseUrl,
        apiKey: await this.registry.getDecryptedApiKey(dbProvider.id),
      };
    }
    // Fallback to env
    return this.getEnvConfig(key);
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.providerConfigCache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.providerConfigCache.clear();
      this.cacheExpiry.clear();
    }
  }
}
```

**Where to resolve:**

- `LlmClientService.getClient(provider: string)` caches client per provider, fetches config if needed
- `LlmHealthService.testLlm()` uses cached config
- Invalidate cache on `PATCH /llm/admin/providers/:id`

**Startup:**

- `LlmModule.onModuleInit()` bootstrap default provider config once, cache it
- Seed providers from env/static, cache fills after first DB query

This keeps boot time fast and request latency low without blocking on DB every time.

---

## 8. Ollama Offline Handling

**Decision:** Graceful degradation with clear fallback rules.

When Ollama is down/unreachable:

**In model discovery (`getModelOptions()`):**

- `discoverOllamaModels()` catches connection error (timeout, ECONNREFUSED, etc.)
- Returns empty array instead of throwing
- Logs warning: `"Ollama unavailable at {baseUrl}"`
- Ollama group and ollama-cloud group are omitted from response
- Chat/status endpoints still work with other providers

**In health check (`testAllModels()`):**

- Skip Ollama provider if unreachable
- Log in test results: `{ providerId: ollama, available: false, success: false, errorMessage: "Connection timeout" }`
- Continue testing other providers

**In chat request critical distinction:**

1. **Explicit request** (user specified `provider: 'ollama'` or `provider: 'ollama-cloud'`):
   - If Ollama is down return error (do NOT silent fallback)
   - Message: `"Ollama provider is currently offline"`
   - User explicitly chose it, they should know it failed

2. **Implicit request** (no `provider` specified, using bootstrap provider):
   - If bootstrap provider is Ollama and it's down:
     - Fallback to next active provider's default model
     - **Return fallback info in response:** `{ fallbackProvider: 'openrouter', originalProvider: 'ollama', reason: 'offline' }`
     - Log: `"Bootstrap provider Ollama offline, using fallback: openrouter"`
   - If bootstrap provider is not Ollama or is healthy proceed normally

**Implementation:**

```typescript
// In LlmModelCatalogService
private async discoverOllamaModels(): Promise<OllamaModel[]> {
  try {
    const response = await this.httpClient
      .get(`${this.ollamaUrl}/api/tags`, { timeout: 5000 })
      .toPromise();
    return response.models || [];
  } catch (error) {
    this.logger.warn(`Ollama discovery failed at ${this.ollamaUrl}:`, error.message);
    return [];
  }
}

// In LlmClientService.getClient()  for explicit requests
async getClient(provider: string): Promise<LlmClient> {
  const config = await this.getProviderConfig(provider);
  if (!config) {
    throw new NotFoundException(`Provider ${provider} not configured or unavailable`);
  }
  // Try to connect; let error bubble for explicit requests
  return this.createClient(provider, config);
}

// In chat handler  for implicit requests with bootstrap fallback
async handleChat(req: ChatRequest): Promise<ChatResponse> {
  let provider = req.provider;
  let model = req.model;
  let fallbackInfo = null;

  // If no explicit provider, use bootstrap
  if (!provider) {
    provider = await this.getBootstrapProvider();

    // Check if bootstrap provider is reachable
    try {
      const config = await this.getProviderConfig(provider);
      // Try quick health check for Ollama
      if (provider === 'ollama') {
        await this.ollama.healthCheck(); // timeout 2s
      }
    } catch (error) {
      // Bootstrap provider is down, fallback to next active
      const nextProvider = await this.getNextActiveProvider(provider);
      fallbackInfo = {
        originalProvider: provider,
        fallbackProvider: nextProvider,
        reason: 'offline'
      };
      provider = nextProvider;
      this.logger.log(`Bootstrap provider ${fallbackInfo.originalProvider} offline, using ${provider}`);
    }
  }

  // Proceed with selected provider
  const response = await this.llmService.chat(provider, model, req);

  // Include fallback info if applicable
  if (fallbackInfo) {
    response.metadata = { fallbackInfo };
  }

  return response;
}
```

Result:

- Explicit Ollama request fails clearly (user knows)
- Bootstrap fallback is transparent and logged (user sees what happened)
- Other providers unaffected
- Ollama auto-discovers when it comes back

---

## Updated Phase 1 Checklist

Before coding Phase 1, confirm:

- [ ] Global default hybrid approach documented and agreed
- [ ] `ProviderType` enum defined (4 hardcoded values)
- [ ] `ollama-cloud` computed at read-time, never persisted
- [ ] `rateLimitFlag: boolean` added to `LlmProvider` entity
- [ ] `EncryptionService` fail-fast validation on module init
- [ ] `backend/.env.example` created with all vars
- [ ] `getProviderConfig()` async with 5min cache documented
- [ ] `LlmModule.onModuleInit()` bootstraps default provider config
- [ ] Ollama offline handling: graceful degradation, not hard failure

Once all 9 items are confirmed, Phase 1 code can proceed without rework.

---

## What This Means for Code

**Changes to existing services:**

1. `LlmProviderConfigService.getProviderConfig(key)` async (add cache layer)
2. `LlmClientService` resolve clients lazily on request, cache by provider key
3. `LlmHealthService.testLlm()` no change in signature, uses cached config
4. `LlmModelCatalogService.getModelOptions()` reads from DB + Ollama discovery, merges into existing response shape

**No breaking changes to chat API:**

- `POST /chat` already accepts `{ provider?, model? }`
- If missing, falls back to bootstrap provider + default model
- Response shape stays identical

**New entry point:**

- `/llm/admin/providers` and siblings (Phase 3)

---

## Risk Mitigation

| Risk                             | Mitigation                                      |
| -------------------------------- | ----------------------------------------------- |
| Encryption key missing           | Fail-fast in `EncryptionService` constructor    |
| Broken default model on startup  | Bootstrap populates cache, DB fallback to env   |
| Async bottleneck on chat request | 5-min cache + lazy client creation              |
| Existing behavior breaks         | Keep response shapes identical, fallback to env |
| `ollama-cloud` disappears        | Compute at read time, not DB-persisted          |
