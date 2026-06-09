# LLM Service Refactor Plan

## Goal

Refactor `backend/src/modules/llm/llm.service.ts` into smaller services with clear responsibilities.

The public API should stay the same:

- `LlmController` should keep calling `LlmService`.
- `AdminAgentService` should keep injecting `LlmService`.
- Existing endpoints should keep returning the same response shapes.
- Model selection from the frontend should keep working.
- Tool execution and streaming should keep working.

The refactor should make `LlmService` a thin facade instead of one large class that owns every LLM concern.

## Current Problem

`llm.service.ts` currently mixes several responsibilities:

- Reads provider configuration from environment variables.
- Builds OpenAI-compatible clients.
- Tracks the active provider and model.
- Calls chat completions.
- Streams chat completions.
- Retries failed provider calls.
- Reads local Ollama models.
- Builds grouped model options for the frontend.
- Builds provider status responses.
- Tests one model.
- Tests all configured models.
- Contains local helper types and helper functions.

This makes the service harder to maintain, test, and extend.

## Target Structure

```txt
backend/src/modules/llm/
  llm.module.ts
  llm.controller.ts
  llm.service.ts

  services/
    llm-provider-config.service.ts
    llm-client.service.ts
    llm-model-catalog.service.ts
    llm-health.service.ts

  constants/
    llm-model-catalog.constant.ts

  dto/
    llm-model-group.dto.ts
    llm-provider.dto.ts
    llm-status.dto.ts

  types/
    llm.types.ts
    ollama.types.ts
```

## Final Responsibilities

### `LlmService`

Keep this as the public facade for the rest of the backend.

It should expose the same methods as today:

- `getProviders()`
- `getModelOptions()`
- `getStatus()`
- `getRuntimeSelection(...)`
- `generateResponse(...)`
- `generateStream(...)`
- `testLlm(...)`
- `testAllModels()`

It should delegate the real work to smaller internal services.

### `LlmProviderConfigService`

Own all provider configuration logic.

Responsibilities:

- Read `AI_PROVIDER`.
- Read provider-specific env values:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_BASE_URL`
  - `OPENROUTER_MODEL`
  - `NVIDIA_API_KEY`
  - `NVIDIA_BASE_URL`
  - `NVIDIA_MODEL`
  - `OLLAMA_API_KEY`
  - `OLLAMA_BASE_URL`
  - `OLLAMA_MODEL`
- Return provider config by provider id.
- Return OpenRouter default headers.
- Check whether a provider is configured.
- Return runtime provider/model selection with request overrides.

Suggested methods:

```ts
getActiveProvider(): LlmProvider
getActiveModel(): string
getProviderConfig(provider: LlmProvider): LlmProviderConfig
getDefaultHeaders(provider: LlmProvider): Record<string, string>
isProviderConfigured(config: LlmProviderConfig): boolean
getRuntimeSelection(providerOverride?: LlmProvider, modelOverride?: string): LlmRuntimeSelection
```

### `LlmClientService`

Own all provider calls.

Responsibilities:

- Create OpenAI-compatible clients.
- Generate non-streaming chat responses.
- Generate streaming chat responses.
- Apply retry behavior.
- Log provider/model used for each call.

Suggested methods:

```ts
generateResponse(request: LlmRequest): Promise<LlmResponse>
generateStream(request: LlmRequest): AsyncIterable<string>
```

### `LlmModelCatalogService`

Own model and provider metadata.

Responsibilities:

- Return provider status metadata.
- Return grouped model options for the frontend select.
- Read local Ollama models from `/api/tags`.
- Split Ollama models into regular and cloud groups.
- Hide embedding models from chat model options.
- Print local Ollama models on startup when relevant.

Suggested methods:

```ts
getProviders(): Promise<ServiceResultContainer<LlmProviderDto[]>>
getModelOptions(): Promise<ServiceResultContainer<LlmModelGroupDto[]>>
getSafeLocalOllamaModels(): Promise<OllamaModel[]>
printLocalOllamaModels(): Promise<void>
```

### `LlmHealthService`

Own model test flows.

Responsibilities:

- Test a single model.
- Test all configured models.
- Build test targets from static cloud models and local Ollama models.

Suggested methods:

```ts
testLlm(provider: LlmProvider, model: string, prompt: string, systemContext: string): Promise<ServiceResultContainer<{ provider: LlmProvider; model: string; available: boolean }>>
testAllModels(): Promise<ServiceResultContainer<LlmModelTestResult[]>>
```

### `ollama.types.ts`

Move Ollama-specific types out of `llm.service.ts`.

Suggested types:

```ts
export type OllamaModel = {
  name: string;
  size?: number;
  details?: {
    family?: string;
  };
};

export type OllamaTagsResponse = {
  models?: OllamaModel[];
};
```

### `llm.types.ts`

Keep shared LLM runtime types here.

Keep:

- `LlmProvider`
- `LlmToolSchema`
- `LlmToolCall`
- `LlmResponse`
- `LlmMessage`
- `LlmRequest`
- `LlmRuntimeSelection`
- `LlmModelCheckTarget`
- `LlmModelTestResult`

Add if needed:

```ts
export type LlmProviderConfig = {
  id: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};
```

## Phase 0 - Safety Baseline

Purpose: confirm current behavior before moving code.

Steps:

1. Run backend build.
2. Check current LLM endpoints manually or through Swagger.
3. Note current response shapes.

Verification:

```txt
npm.cmd run build -w backend
```

Expected:

- Build passes before refactor.
- No behavior changes yet.

Checklist:

- [ ] Backend build passes before changes.
- [ ] `GET /llm/providers` works.
- [ ] `GET /llm/model-options` works.
- [ ] `GET /llm/status` works.
- [ ] Chat still sends a prompt successfully.

## Phase 1 - Move Shared Types

Purpose: remove local type declarations from `llm.service.ts`.

Steps:

1. Create `backend/src/modules/llm/types/ollama.types.ts`.
2. Move `OllamaModel` and `OllamaTagsResponse` into it.
3. Move `LlmProviderConfig` into `llm.types.ts`.
4. Update imports in `llm.service.ts`.
5. Replace helper `any[]` usage with `OllamaModel[]`.

Verification:

```txt
npm.cmd run build -w backend
```

Expected:

- No local provider/Ollama types remain inside `llm.service.ts`.
- No `any[]` remains in Ollama model helpers.

Checklist:

- [ ] `ollama.types.ts` created.
- [ ] `LlmProviderConfig` exported from `llm.types.ts`.
- [ ] `llm.service.ts` imports these types.
- [ ] `separateOllamaModels(models: OllamaModel[])` uses a typed array.
- [ ] `toModelItems(models: OllamaModel[])` uses a typed array.
- [ ] Backend build passes.

## Phase 2 - Extract Provider Config Service

Purpose: isolate env/config logic.

Steps:

1. Create `backend/src/modules/llm/services/llm-provider-config.service.ts`.
2. Move provider constants and provider config methods into it:
   - `LLM_PROVIDERS`
   - `getProviderConfig`
   - `getDefaultHeaders`
   - `isProviderConfigured`
   - active provider/model initialization
   - `getRuntimeSelection`
3. Keep missing env validation behavior the same.
4. Update `llm.module.ts` providers.
5. Update `llm.service.ts` to delegate config calls.

Verification:

```txt
npm.cmd run build -w backend
```

Expected:

- `LlmService` no longer reads env directly.
- Existing default provider/model behavior remains the same.

Checklist:

- [ ] `LlmProviderConfigService` created.
- [ ] Env reading moved out of `LlmService`.
- [ ] Missing provider/model/api key errors still happen.
- [ ] `getRuntimeSelection(...)` still available through `LlmService`.
- [ ] `llm.module.ts` registers `LlmProviderConfigService`.
- [ ] Backend build passes.

## Phase 3 - Extract Client Service

Purpose: isolate OpenAI-compatible provider calls.

Steps:

1. Create `backend/src/modules/llm/services/llm-client.service.ts`.
2. Move OpenAI client creation into it.
3. Move retry constants and `withRetry` into it.
4. Move `generateResponse` into it.
5. Move `generateStream` into it.
6. Use `LlmProviderConfigService` inside `LlmClientService`.
7. Update `LlmService` to delegate `generateResponse` and `generateStream`.

Verification:

```txt
npm.cmd run build -w backend
```

Expected:

- Chat can still generate a normal response.
- Chat can still stream a response.
- Tool call behavior remains unchanged.

Checklist:

- [ ] `LlmClientService` created.
- [ ] OpenAI import moved out of `LlmService`.
- [ ] Retry logic moved out of `LlmService`.
- [ ] `generateResponse(...)` delegates through facade.
- [ ] `generateStream(...)` delegates through facade.
- [ ] Backend build passes.

## Phase 4 - Extract Model Catalog Service

Purpose: isolate provider metadata, frontend model options, and Ollama discovery.

Steps:

1. Create `backend/src/modules/llm/services/llm-model-catalog.service.ts`.
2. Move `getProviders`.
3. Move `getModelOptions`.
4. Move `getLocalOllamaModels`.
5. Move `getSafeLocalOllamaModels`.
6. Move `printLocalOllamaModels`.
7. Move model helper functions:
   - `separateOllamaModels`
   - `isEmbeddingModel`
   - `toModelItems`
8. Inject `LlmProviderConfigService`.
9. Keep `OnModuleInit` behavior, either:
   - inside `LlmModelCatalogService`, or
   - in `LlmService` delegating to `modelCatalog.printLocalOllamaModels()`.

Recommended choice:

Keep `OnModuleInit` in `LlmModelCatalogService`, because printing local model catalog belongs with model catalog logic.

Verification:

```txt
npm.cmd run build -w backend
```

Expected:

- Frontend model select still receives the same grouped model structure.
- Ollama local models still appear when available.
- Embedding models are still filtered out.

Checklist:

- [ ] `LlmModelCatalogService` created.
- [ ] Provider metadata moved out of `LlmService`.
- [ ] Ollama discovery moved out of `LlmService`.
- [ ] `getProviders()` delegates through facade.
- [ ] `getModelOptions()` delegates through facade.
- [ ] `llm.module.ts` registers `LlmModelCatalogService`.
- [ ] Backend build passes.

## Phase 5 - Extract Health Service

Purpose: isolate model testing flows.

Steps:

1. Create `backend/src/modules/llm/services/llm-health.service.ts`.
2. Move `testLlm`.
3. Move `testAllModels`.
4. Move `getModelCheckTargets`.
5. Inject:
   - `LlmClientService`
   - `LlmProviderConfigService`
   - `LlmModelCatalogService`
6. Update `LlmService` to delegate test methods.

Verification:

```txt
npm.cmd run build -w backend
```

Expected:

- `GET /llm/llm-test` still works.
- `GET /llm/test-all` still works.
- Parallel test behavior stays the same.

Checklist:

- [ ] `LlmHealthService` created.
- [ ] Single-model test moved out of `LlmService`.
- [ ] All-model test moved out of `LlmService`.
- [ ] Test target collection moved out of `LlmService`.
- [ ] `llm.module.ts` registers `LlmHealthService`.
- [ ] Backend build passes.

## Phase 6 - Reduce `LlmService` To Facade

Purpose: make the public service small and stable.

Steps:

1. Remove any remaining business logic from `LlmService`.
2. Keep only constructor injections and delegation methods.
3. Confirm `AdminAgentService` import does not need to change.
4. Confirm `LlmController` import does not need to change.

Expected facade shape:

```ts
@Injectable()
export class LlmService {
  constructor(
    private readonly providerConfig: LlmProviderConfigService,
    private readonly modelCatalog: LlmModelCatalogService,
    private readonly client: LlmClientService,
    private readonly health: LlmHealthService,
  ) {}

  getProviders() {
    return this.modelCatalog.getProviders();
  }

  getModelOptions() {
    return this.modelCatalog.getModelOptions();
  }

  getRuntimeSelection(providerOverride?: LlmProvider, modelOverride?: string) {
    return this.providerConfig.getRuntimeSelection(providerOverride, modelOverride);
  }

  generateResponse(request: LlmRequest) {
    return this.client.generateResponse(request);
  }

  generateStream(request: LlmRequest) {
    return this.client.generateStream(request);
  }

  testLlm(provider: LlmProvider, model: string, prompt: string, systemContext: string) {
    return this.health.testLlm(provider, model, prompt, systemContext);
  }

  testAllModels() {
    return this.health.testAllModels();
  }
}
```

Verification:

```txt
npm.cmd run build -w backend
```

Checklist:

- [ ] `LlmService` is mostly delegation.
- [ ] No OpenAI client creation remains in `LlmService`.
- [ ] No Ollama fetch logic remains in `LlmService`.
- [ ] No retry logic remains in `LlmService`.
- [ ] No env parsing remains in `LlmService`.
- [ ] Backend build passes.

## Phase 7 - Manual Runtime Verification

Purpose: confirm real behavior, not just compilation.

Manual checks:

1. Login to the frontend.
2. Open chat.
3. Confirm the model select loads options from the backend.
4. Select an OpenRouter model.
5. Send a prompt.
6. Confirm backend logs show the selected OpenRouter model.
7. Select an Nvidia model.
8. Send a prompt.
9. Confirm backend logs show the selected Nvidia model.
10. Ask the agent which model is active for the current request.
11. Confirm the answer matches the selected model.
12. Call or ask for the LLM test endpoint.
13. Confirm `llm-test` still works.
14. Call or ask for all model tests only when acceptable, because it can trigger many provider calls.

Checklist:

- [ ] Model options load in frontend.
- [ ] Selected model reaches backend.
- [ ] Chat response still streams.
- [ ] Tool calls still work.
- [ ] `GET /llm/providers` works.
- [ ] `GET /llm/model-options` works.
- [ ] `GET /llm/status` works.
- [ ] `GET /llm/llm-test` works.
- [ ] `GET /llm/test-all` works when intentionally tested.

## Phase 8 - Architecture Diagram Update

Purpose: keep architecture documentation accurate.

Because this refactor changes the internal structure of `LlmModule`, update:

```txt
documents/architecture-diagram.md
```

Required diagram updates:

- Replace the simple `LlmService -> ModelCatalog/providers` picture with internal LLM services.
- Show:
  - `LlmService` as facade.
  - `LlmProviderConfigService`.
  - `LlmClientService`.
  - `LlmModelCatalogService`.
  - `LlmHealthService`.
- Keep external providers unchanged:
  - OpenRouter
  - NVIDIA
  - Ollama
- Keep model selection flow functionally the same, but mention that `LlmService` delegates to catalog/config/client services.

Checklist:

- [ ] `documents/architecture-diagram.md` updated.
- [ ] Mermaid renders conceptually.
- [ ] Current architecture notes mention facade split if needed.

## Phase 9 - Final Cleanup

Purpose: remove leftover clutter caused by the refactor.

Steps:

1. Search for local types that should no longer exist in `llm.service.ts`.
2. Search for `any[]` in the LLM module.
3. Search for unused imports.
4. Search for direct OpenAI imports outside `LlmClientService`.
5. Search for direct config env parsing outside `LlmProviderConfigService`.

Suggested searches:

```txt
rg -n "type LlmProviderConfig|type OllamaModel|type OllamaTagsResponse|any\\[]" backend/src/modules/llm
rg -n "from 'openai'|from \"openai\"" backend/src/modules/llm
rg -n "configService.get" backend/src/modules/llm
```

Checklist:

- [ ] No local provider/Ollama types remain in `llm.service.ts`.
- [ ] No `any[]` remains in LLM model helpers.
- [ ] Only `LlmClientService` imports OpenAI.
- [ ] Only `LlmProviderConfigService` reads env values.
- [ ] No unused imports remain.
- [ ] Backend build passes.

## Suggested Agent Split

### Agent 1 - Types And Provider Config

Owner:

```txt
backend/src/modules/llm/types/
backend/src/modules/llm/services/llm-provider-config.service.ts
```

Checklist:

- [ ] Create `ollama.types.ts`.
- [ ] Move `LlmProviderConfig` to shared LLM types.
- [ ] Create `LlmProviderConfigService`.
- [ ] Move env/config/default-header logic.
- [ ] Build passes.

### Agent 2 - Client Runtime

Owner:

```txt
backend/src/modules/llm/services/llm-client.service.ts
```

Checklist:

- [ ] Create `LlmClientService`.
- [ ] Move OpenAI client creation.
- [ ] Move retry logic.
- [ ] Move `generateResponse`.
- [ ] Move `generateStream`.
- [ ] Build passes.

### Agent 3 - Model Catalog

Owner:

```txt
backend/src/modules/llm/services/llm-model-catalog.service.ts
```

Checklist:

- [ ] Create `LlmModelCatalogService`.
- [ ] Move provider metadata.
- [ ] Move model options.
- [ ] Move Ollama discovery.
- [ ] Remove `any[]` from model helpers.
- [ ] Build passes.

### Agent 4 - Health Checks

Owner:

```txt
backend/src/modules/llm/services/llm-health.service.ts
```

Checklist:

- [ ] Create `LlmHealthService`.
- [ ] Move `testLlm`.
- [ ] Move `testAllModels`.
- [ ] Move model check target creation.
- [ ] Build passes.

### Agent 5 - Facade And Module Integration

Owner:

```txt
backend/src/modules/llm/llm.service.ts
backend/src/modules/llm/llm.module.ts
```

Checklist:

- [ ] Register all new services.
- [ ] Reduce `LlmService` to facade.
- [ ] Keep controller and admin-agent imports unchanged.
- [ ] Build passes.

### Agent 6 - Verification And Documentation

Owner:

```txt
documents/architecture-diagram.md
```

Checklist:

- [ ] Run backend build.
- [ ] Manually verify LLM endpoints.
- [ ] Manually verify chat model selection.
- [ ] Update architecture diagram.
- [ ] Confirm no unrelated files changed.

## Risks

### Risk: Breaking `AdminAgentService`

`AdminAgentService` currently injects `LlmService`.

Mitigation:

Keep `LlmService` as the public facade and do not make `AdminAgentService` depend on lower-level LLM services.

### Risk: Breaking Frontend Model Select

The frontend expects grouped model options from `GET /llm/model-options`.

Mitigation:

Do not change `LlmModelGroupDto` or the endpoint response shape.

### Risk: Changing Active Model Behavior

The backend currently uses request overrides when provider/model are selected in the frontend.

Mitigation:

Keep `getRuntimeSelection(...)`, `providerOverride`, and `modelOverride` behavior exactly the same.

### Risk: Hidden Provider Call Changes

Small changes to headers, base URLs, or model values can break providers.

Mitigation:

Move config code without changing values or environment variable names.

### Risk: `test-all` Can Be Expensive

`GET /llm/test-all` can call many provider models in parallel.

Mitigation:

Do not automatically call it during normal build verification. Run it manually only when intended.

## Definition Of Done

The refactor is complete only when:

- `llm.service.ts` is a thin facade.
- Provider config logic is isolated.
- OpenAI client and completion logic is isolated.
- Model catalog and Ollama discovery are isolated.
- Health checks are isolated.
- Existing controller endpoints still work.
- Chat model selection still works.
- Backend build passes.
- Architecture diagram is updated.
- No unrelated code was refactored.

