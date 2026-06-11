# Provider And LLM DB Plan

## Goal

Move LLM provider and model management from static constants and environment-only configuration into the database, and expose an Angular settings UI for admins to manage providers and models.

The chat UI must continue to work through the existing model selection flow:

- `GET /llm/model-options`
- `GET /llm/status`
- per-request `provider` and `model` overrides in chat requests

## Current State

- Backend LLM runtime configuration is mostly environment-driven through `LlmProviderConfigService`.
- Static cloud model options come from `backend/src/modules/llm/constants/llm-model-catalog.constant.ts`.
- Ollama models are discovered dynamically through the local Ollama `/api/tags` endpoint.
- Angular chat consumes `frontend/src/app/core/services/llm.service.ts`.
- `frontend/src/app/features/settings/` currently exists but is incomplete and should be treated as a rough placeholder, not as the final implementation pattern.

## Target Data Model

### LlmProvider Entity

Table: `llm_providers`

Fields:

- `id: number`
- `key: string`
  - Examples: `openrouter`, `nvidia`, `ollama`
  - Stable technical id used by backend request routing.
- `label: string`
  - Human-facing provider label.
- `baseUrl: string`
- `apiKeyEncrypted: string | null`
  - Never return this value to the frontend.
  - For Ollama this can stay null or a non-secret internal value.
- `defaultModelId: number | null`
  - Relation to `LlmModel`.
- `active: boolean`
  - Whether this provider can be selected and used.
- `createdAt: Date`
- `updatedAt: Date`

Constraints:

- Unique `key`.
- `baseUrl` required.
- `label` required.

### LlmModel Entity

Table: `llm_models`

Fields:

- `id: number`
- `providerId: number`
- `name: string`
  - Exact provider model id sent to the LLM API.
  - Examples: `google/gemma-4-31b-it:free`, `notron 3 Super 120b A12B(NVIDIA)`.
- `label: string`
  - Human-facing label shown in Angular selectors.
- `active: boolean`
- `supportsStreaming: boolean`
- `supportsTools: boolean`
- `contextWindow: number | null`
- `sortOrder: number`
- `createdAt: Date`
- `updatedAt: Date`

Constraints:

- Unique pair: `providerId + name`.
- `name` required.
- `label` required.

## API Contract

All management endpoints require JWT and admin authorization.

Keep existing read endpoints compatible:

- `GET /llm/providers`
- `GET /llm/model-options`
- `GET /llm/status`
- `GET /llm/llm-test`
- `GET /llm/test-all`

Add management endpoints:

### Providers

- `GET /llm/admin/providers`
  - Returns providers with safe metadata only.
  - Includes `hasApiKey: boolean`, not the actual key.

- `POST /llm/admin/providers`
  - Creates a provider.
  - Body: `key`, `label`, `baseUrl`, optional `apiKey`, optional `active`.

- `PATCH /llm/admin/providers/:id`
  - Updates provider metadata.
  - Empty or omitted `apiKey` means keep existing key.
  - Explicit key replacement should overwrite the stored encrypted key.

- `DELETE /llm/admin/providers/:id`
  - Prefer soft disable first: set `active = false`.
  - Hard delete only if no models/history dependencies make that risky.

### Models

- `GET /llm/admin/providers/:providerId/models`
  - Returns models for one provider.

- `POST /llm/admin/providers/:providerId/models`
  - Creates a model under a provider.
  - Body: `name`, `label`, optional capability fields.

- `PATCH /llm/admin/models/:id`
  - Updates model metadata and active state.

- `DELETE /llm/admin/models/:id`
  - Prefer soft disable first: set `active = false`.

- `PATCH /llm/admin/providers/:providerId/default-model/:modelId`
  - Sets provider default model.
  - Validate model belongs to provider.

## DTO Rules

Provider response DTO must include:

- `id`
- `key`
- `label`
- `baseUrl`
- `active`
- `hasApiKey`
- `defaultModelId`
- `defaultModelName`
- `modelsCount`

Provider response DTO must not include:

- `apiKey`
- `apiKeyEncrypted`
- secret headers

Model response DTO must include:

- `id`
- `providerId`
- `name`
- `label`
- `active`
- `supportsStreaming`
- `supportsTools`
- `contextWindow`
- `sortOrder`

Existing chat model options response should remain grouped:

```ts
{
  label: 'openrouter',
  items: [
    {
      id: '1',
      provider: 'openrouter',
      value: 'google/gemma-4-31b-it:free',
      label: 'Google GEMMA 4 31b IT'
    }
  ]
}
```

## Backend Implementation Phases

### Phase 1 - Entities And Module Wiring

Files likely touched:

- `backend/src/modules/llm/entities/llm-provider.entity.ts`
- `backend/src/modules/llm/entities/llm-model.entity.ts`
- `backend/src/modules/llm/llm.module.ts`

Tasks:

- Add TypeORM entities.
- Register entities with `TypeOrmModule.forFeature(...)`.
- Keep `autoLoadEntities` compatibility.

Verification:

- `npm.cmd run build` from `backend/`.

### Phase 2 - Repository Service

Files likely touched:

- `backend/src/modules/llm/services/llm-provider-registry.service.ts`
- `backend/src/modules/llm/services/llm-provider-config.service.ts`
- `backend/src/modules/llm/services/llm-model-catalog.service.ts`

Tasks:

- Add DB-backed registry service for provider/model CRUD and safe read DTO mapping.
- Refactor `LlmProviderConfigService` to resolve provider configs from DB first.
- Preserve env fallback for first boot or missing DB records.
- Refactor `LlmModelCatalogService.getModelOptions()` to use active DB models.
- Keep Ollama dynamic model discovery as a special case, either merged with DB models or exposed as discovered-only options.

Important decision:

- DB is the source of truth for cloud providers and manually added models.
- Env remains a bootstrap/fallback mechanism, not the admin-managed source of truth.

Verification:

- Existing `GET /llm/model-options` still returns the same shape used by Angular chat.
- `npm.cmd run build` from `backend/`.

### Phase 3 - Admin Controller Endpoints

Files likely touched:

- `backend/src/modules/llm/llm.controller.ts`
- new DTO files under `backend/src/modules/llm/dto/`
- `backend/swagger-spec.json`

Tasks:

- Add admin CRUD endpoints.
- Add Swagger docs.
- Add `JwtAuthGuard` and `AdminGuard`.
- Validate all input through DTOs.
- Never return API keys.

Verification:

- `npm.cmd run build` from `backend/`.
- Swagger spec generation/update if controller contract changes are reflected manually in this project.

### Phase 4 - Seed / Bootstrap Defaults

Files likely touched:

- `backend/src/modules/llm/services/llm-provider-seed.service.ts` or similar.
- `backend/src/modules/llm/llm.module.ts`.

Tasks:

- On startup, seed missing providers from existing env values:
  - OpenRouter
  - NVIDIA
  - Ollama
- Seed static models from `LLM_STATIC_MODEL_GROUPS` once, if not present.
- Avoid overwriting admin edits on every boot.

Verification:

- Empty DB gets initial providers/models.
- Existing DB keeps admin changes.
- `npm.cmd run build` from `backend/`.

### Phase 5 - LLM Health Integration

Files likely touched:

- `backend/src/modules/llm/services/llm-health.service.ts`
- `backend/src/modules/llm/services/llm-client.service.ts`

Tasks:

- `testAllModels()` should use active DB models.
- `testLlm(provider, model, ...)` should validate provider/model against DB unless using a discovered Ollama model.
- `LlmClientService` should create provider-specific clients from DB config.

Verification:

- Existing LLM test endpoints compile and keep response shape.
- Runtime manual check with one configured provider.

## Frontend Implementation Phases

### Phase 6 - Angular Service Contract

Files likely touched:

- `frontend/src/app/core/services/llm.service.ts`
- new frontend interfaces if needed under `frontend/src/app/core/models/`

Tasks:

- Keep existing `getModelOptions()` and `getStatus()`.
- Add admin methods:
  - `getAdminProviders()`
  - `createProvider(...)`
  - `updateProvider(...)`
  - `disableProvider(...)`
  - `getProviderModels(providerId)`
  - `createModel(providerId, ...)`
  - `updateModel(modelId, ...)`
  - `disableModel(modelId)`
  - `setDefaultModel(providerId, modelId)`

Verification:

- `npx ng build` from `frontend/`.

### Phase 7 - Settings Page State

Files likely touched:

- `frontend/src/app/features/settings/settings.ts`
- `frontend/src/app/features/settings/settings.html`
- optional `frontend/src/app/features/settings/settings.css` only if global styles are insufficient.

Tasks:

- Turn Settings into a real async page.
- Use `PageStates`.
- Expose `readonly PageStates = PageStates`.
- Add `pageState = computed<PageStates>(...)`.
- Template must use `@switch (pageState())`.
- Load providers from admin API.
- Show empty state only when no providers exist.

Verification:

- `npx ng build` from `frontend/`.

### Phase 8 - Settings UI

UI requirements:

- Page title: settings.
- Main section: LLM providers.
- Provider list:
  - provider label/key
  - base URL
  - active/inactive
  - has API key indicator
  - default model
  - model count
- Provider actions:
  - add provider
  - edit provider
  - disable provider
  - set default model
- Model list per provider:
  - model label
  - model name
  - active/inactive
  - streaming/tools capability badges
  - edit/disable actions
- Forms:
  - use project form controls and global button styles.
  - avoid unnecessary component-specific CSS.

UX rules:

- Never display stored API keys.
- API key field should be write-only.
- On edit, show placeholder like `Configured` when key exists.
- Keep technical values such as provider key, model name, URLs, and API keys left-to-right with `dir="ltr"` where shown.

Verification:

- `npx ng build` from `frontend/`.
- Manual browser check of `/settings`.

## Security Notes

- Do not return secrets to the frontend.
- Do not log API keys.
- Consider encryption for `apiKeyEncrypted`.
- If encryption is not implemented in the first pass, name the risk clearly and keep the field hidden from DTOs.
- Only admins can manage providers and models.
- Regular authenticated users can still read safe model options for chat selection if that is already allowed by the current flow.

## Migration / Compatibility Strategy

1. Add DB entities and seed from current static/env config.
2. Keep current public LLM endpoints response-compatible.
3. Switch model option reads to DB.
4. Add Angular admin UI.
5. Once stable, decide whether `LLM_STATIC_MODEL_GROUPS` remains as seed data only or is deleted.

## Testing Checklist

Backend:

- `npm.cmd run build`
- Existing provider status endpoint still compiles and returns safe DTO shape.
- Existing model options endpoint still groups models by provider.
- Admin CRUD rejects non-admin users.
- API key is never returned in responses.
- Default model must belong to the selected provider.

Frontend:

- `npx ng build`
- `/settings` loading/error/empty/ready states render correctly.
- Add/edit provider updates list without page reload.
- Add/edit model updates provider model list.
- Chat model selector still receives model options in the previous shape.

Manual:

- Configure OpenRouter provider and model.
- Set it as default.
- Send one chat request with that model.
- Run single model test.
- Disable model and confirm it disappears from chat selector.

## Open Decisions

- Should provider deletion be hard delete or soft disable only?
- Should API keys be encrypted at rest in the first implementation phase?
- Should Ollama discovered models be persisted, or should they remain dynamic discovered options?
- Should there be exactly one global default provider/model, or one default model per provider plus env/global active provider?
- Should model capabilities be manually configured or probed automatically?

