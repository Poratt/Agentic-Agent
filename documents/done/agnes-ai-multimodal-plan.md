# Agnes AI Multimodal Integration Plan

## Goal

Make all 4 Agnes AI models usable through the existing LLM backend, not just the chat model.

The Agnes AI provider exposes:

1. `agnes-2.0-flash` — text chat / reasoning (OpenAI-compatible `chat.completions`).
2. `agnes-image-2.0-flash` — image generation & editing (`POST /v1/images/generations`).
3. `agnes-image-2.1-flash` — upgraded image generation, tier-based sizes + ratios.
4. `agnes-video-v2.0` — asynchronous video generation (`POST /v1/videos` + poll `GET /agnesapi?video_id=`).

Today only #1 is intended to work, but it does not work through the DB path because the provider seed is mis-keyed: the seed writes the provider with key `agnes` while the runtime services look up key `agnes-ai`. As a result, `LlmProviderConfigService` and `LlmClientService` can never resolve the seeded provider row, and there is no image/video path at all. This plan fixes the provider wiring, adds image + video generation, and exposes them through capability-aware endpoints.

## Current State (verified against repo on 2026-07-18)

- `backend/src/modules/llm/llm-provider-config.service.ts:5` lists `agnes-ai` as a provider id. `:82-89` returns `baseUrl: AGNES_BASE_URL ?? 'https://apihub.agnes-ai.com/v1'` and `model: AGNES_MODEL ?? 'agnes-2.0-flash'`.
- `backend/src/modules/llm/services/llm-client.service.ts` builds an OpenAI SDK client from the DB provider row and only calls `client.chat.completions.create` (sync + stream) at `:41` and `:95`. No image/video path. `buildUserMessage` at `:125` is the only multimodal helper and it only adds an `image_url` content part to chat.
- `backend/src/core/seeds/llm-providers.seed.ts:46-51` already defines `AGNES_AI_MODELS` with all 4 models, BUT `:119-146` seeds them under provider **key `agnes`** with `baseUrl: 'https://api.agnes.ai/v1'`.
  - **Bug**: `LlmProviderConfigService` and `LlmClientService` look up provider key **`agnes-ai`**, not `agnes`. `resolveEffectiveModel` (via `findProviderByKey('agnes-ai')` in `llm-client.service.ts:147`) will not find the seeded `agnes` row. The Agnes chat model is currently unreachable through the DB path, even though the `AGNES_API_KEY` env var is set.
  - **Bug 2**: the seeded `baseUrl` is the legacy `https://api.agnes.ai/v1`, not the active `https://apihub.agnes-ai.com/v1` that `LlmProviderConfigService` defaults to. Even if the key were aligned, the baseUrl still has to be fixed so requests go to the right host.
- `LlmModelEntity` (`backend/src/modules/llm-provider/entities/llm-model.entity.ts`) has no capability/type field. Chat, image, and video models are indistinguishable, so the client cannot decide which API to call. Note: the file no longer has `isDefault` (removed in 2026-07-18), but the frontend `LlmModel` interface in `frontend/src/app/core/services/llm-provider.service.ts:13` still declares `isDefault: boolean` — this is a stale field that should be cleaned up alongside this plan.
- `LlmProviderService.resolveEffectiveModel` (`backend/src/modules/llm-provider/llm-provider.service.ts:43`) resolves `provider + model` via explicit override → user default (`user_llm_defaults`) → legacy env. For Agnes image/video, the model keys are already in the DB once the provider key is fixed, so resolution works as soon as the seed is corrected.
- Auth: `agnes-ai` uses `Authorization: Bearer <AGNES_API_KEY>`; the OpenAI SDK already sends `Authorization: Bearer` from `apiKey`. The Agnes image endpoint is documented as OpenAI-compatible and may be reachable through `client.images.generate` (needs live verification — see Risks).
- There is **no `GET /llm/model-options` endpoint** in the codebase (`backend/src/modules/llm/llm.controller.ts` only has `models/:id/test`, `test-results/:id`, `set-default-model`, `default-model`). The plan in the previous version of this document referenced that endpoint as if it existed; it does not, and this rewrite removes that assumption. Frontend chat builds its model dropdown directly from the providers store, which calls `LlmProviderService.findAll()` and flattens the `models` array. The new `capability` field will propagate to the frontend through that path naturally — no separate endpoint is needed.
- `LlmTasksService` (`backend/src/modules/llm/services/llm-tasks.service.ts`) already shows the project pattern for scheduled jobs: `@Cron` decorator on injected service methods, with one `try/catch` per job and a `this.logger.log/error` wrapper. Video polling is on-demand via the HTTP endpoint, not a background job (matches the existing test-results retention design).
- `LlmHealthService.testAllModels` (called by the nightly cron in `LlmTasksService.handleNightlyLlmHealthCheck` at `:16`) iterates **all** active models. After Phase 1 adds image/video models, the health check will try to call them through `chat.completions.create` and fail every night. The plan must guard this — see Phase 2.

## Target Model

### LlmModel capability field

Add an enum column to `LlmModelEntity` so the client can route by model type:

- `capability: 'text' | 'image' | 'video'` (default `'text'`).
- Stored as MySQL `enum`. TypeScript union type `LlmModelCapability`.
- Seed sets `capability` per Agnes model:
  - `agnes-2.0-flash` → `text`
  - `agnes-image-2.0-flash` → `image`
  - `agnes-image-2.1-flash` → `image`
  - `agnes-video-v2.0` → `video`
- For other providers (openrouter, nvidia, ollama, ollama-cloud), default `capability: 'text'`. Ollama is text-only; we do not advertise local image/video models.

### Provider key + baseUrl fix

Change the seed (and any config fallback) so the Agnes provider uses key **`agnes-ai`** with `baseUrl: 'https://apihub.agnes-ai.com/v1'` to match `LlmProviderConfigService`. Existing mis-keyed `agnes` rows must be reconciled (see Phase 1).

## Backend Implementation Phases

### Phase 1 - Fix provider seed + add capability field

Files touched:

- `backend/src/core/seeds/llm-providers.seed.ts`
- `backend/src/modules/llm-provider/entities/llm-model.entity.ts`
- `backend/src/modules/llm/types/llm.types.ts` (add `LlmModelCapability` union)
- `backend/src/modules/llm-provider/dto/create-llm-model.dto.ts` and `update-llm-model.dto.ts` (allow `capability` for manual creation)
- DB: `synchronize: true` drops/creates columns automatically (no manual migration needed, consistent with the rest of the project).

Tasks:

- Change seed Agnes block to use `key: 'agnes-ai'`, `baseUrl: process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1'`.
- Reconcile the existing `agnes` row: detect by old `key === 'agnes'`, update its `key` to `'agnes-ai'` and its `baseUrl` to the apihub URL, then re-link its existing model rows by `providerId` so the foreign keys are preserved. Add an idempotent guard so a re-run after the rename is a no-op. Do not delete the row and reinsert — that would orphan or duplicate model rows that already have FK constraints. Specifically: `findOne({ where: [{ key: 'agnes' }, { key: 'agnes-ai' }] })` first; if a row exists with either key, update it in place to the new key + baseUrl; only `save()` a brand-new entity if neither row exists. The current `findOne` query in the seed at `:119` would otherwise fail on a unique-key collision if it tries to insert `agnes-ai` while the old `agnes` row is still present.
- Add `capability` enum to `LlmModelEntity` (default `'text'`) and to the seed: write `capability` per Agnes model and leave it default for OpenRouter/NVIDIA/Ollama models.
- Update `findProviders` (and any other place that returns model rows) so the `capability` field is part of the response shape — `synchronize` adds the column, but TypeScript only sees what the entity declares.

Verification:

- `npm.cmd run build` from `backend/`.
- `SHOW COLUMNS FROM llm_models` shows the `capability` enum; `llm_providers` has one `agnes-ai` row (no duplicate `agnes`).
- `SELECT key, baseUrl FROM llm_providers` returns `agnes-ai` with the apihub URL.
- A DB read of the Agnes provider's models returns all 4 models with the correct capability values.

### Phase 2 - Capability guard on the chat + health-check paths

The chat path must reject image/video models early instead of silently feeding them to `client.chat.completions.create`. The nightly health check (`LlmTasksService.handleNightlyLlmHealthCheck`) must also skip non-text models so the cron does not log them as failed every night. Two small guards, but they prevent the rest of the plan from polluting the test-results table.

Files touched:

- `backend/src/modules/llm/services/llm-client.service.ts` (`generateResponse` and `generateStream`)
- `backend/src/modules/llm/services/llm-health.service.ts` (`testAllModels` and the per-model branch in `testLlm`)

Tasks:

- After `resolveEffectiveModel` returns in chat, load the `LlmModelEntity` row (or extend `resolveEffectiveModel` to also return `capability`) and reject with `BadRequestException('Model does not support text chat')` when `capability !== 'text'`.
- Keep the existing retry + logging untouched in the chat path.
- In `LlmHealthService.testAllModels`, filter the model list to `capability === 'text'` before iterating. Log a one-line `Skipping non-text model ${key}` per skipped model so the audit trail is clear.
- In `LlmHealthService.testLlm` (the single-model path used by `POST /llm/models/:id/test`), reject with `BadRequestException` when the target model's `capability !== 'text'`. The Settings UI's test button will surface a clear message instead of a 500.

Verification:

- `npm.cmd run build`.
- `POST /admin-agent/stream` with `model: 'agnes-image-2.0-flash'` returns 400 with the guard message; `model: 'agnes-2.0-flash'` still streams (regression).
- `POST /llm/models/:id/test` on an image model returns 400; on the chat model it still records a result.
- Manually call `LlmHealthService.testAllModels` against a DB that has all 4 Agnes models: only `agnes-2.0-flash` is tested; the other 3 are logged as skipped.

### Phase 3 - Image generation client path

Files touched:

- `backend/src/modules/llm/services/llm-client.service.ts` (add `generateImage`)
- `backend/src/modules/llm/types/llm.types.ts` (add `LlmImageRequest` / `LlmImageResult`)
- `backend/src/modules/llm/llm.controller.ts` (new endpoint, see API contract)
- `backend/src/modules/llm/llm.service.ts` (wire controller → client)
- `backend/src/modules/llm/dto/` (new DTOs)

Tasks:

- Add `generateImage(request)` to `LlmClientService`:
  - Resolve provider/model via `resolveEffectiveModel` (provider `agnes-ai`).
  - Read `capability` from the resolved model; if not `image`, throw a clear `BadRequestException('Model does not support image generation')`.
  - Build the request:
    - For `agnes-image-2.0-flash`: use `client.images.generate` with `model`, `prompt`, `size`, and `n: 1`. Map `returnBase64` to `response_format: 'b64_json'`. For image-to-image/multi-image edits, pass the input images via `extra_body.image` as an array of URLs or Data URI Base64 strings.
    - For `agnes-image-2.1-flash`: same call, but support tier `size` (`'1K' | '2K' | '4K'`) plus `ratio` (`'1:1' | '16:9' | ...`) inside `extra_body`. Keep exact sizes like `1024x768` accepted by passing them through, but document the recommended form.
    - Keep `response_format` inside `extra_body` (Agnes-specific quirk — top-level `response_format` returns 400 on this provider).
  - Return `{ url?, b64Json?, mimeType?, size? }` derived from `data[0]`.
- Use the existing OpenAI client (`client.images.generate`) where the SDK shape is compatible. If a smoke test in Phase 3 verification shows the SDK rejects `extra_body`, switch the image path to a raw `fetch` against `baseUrl/images/generations` with `Authorization: Bearer ${apiKey}`. Document the chosen path in the final HANDOFF.
- Apply the same `withRetry` wrapper used by chat (503/502 retryable), but raise the per-attempt timeout to 360s for image generation. Adjust `LlmClientService` to take an optional `timeoutMs` so the chat path keeps its existing 1024-token default budget.

Verification:

- `npm.cmd run build`.
- `POST /llm/image/generate` with `prompt: 'a red apple'`, `modelId: <id-of-agnes-image-2.0-flash>` returns a hosted image URL.
- Image-to-image with an `image` field returns an edited result.
- `modelId: <id-of-agnes-image-2.1-flash>` with `size: '2K'`, `ratio: '16:9'` returns an image that resolves to roughly `2624x1472`.
- Calling the chat path with an image model returns 400 from the Phase 2 guard.

### Phase 4 - Video generation client path (async)

Files touched:

- `backend/src/modules/llm/services/llm-client.service.ts` (add `createVideoTask` + `getVideoResult`)
- `backend/src/modules/llm/services/llm-tasks.service.ts` (no scheduled job — polling is on-demand)
- `backend/src/modules/llm/types/llm.types.ts` (add `LlmVideoRequest` / `LlmVideoTask` / `LlmVideoResult`)
- `backend/src/modules/llm/llm.controller.ts` (new endpoints)

Tasks:

- Add `createVideoTask(request)`:
  - Resolve provider/model (`agnes-ai`, `agnes-video-v2.0`); reject with `BadRequestException` if `capability !== 'video'`.
  - Call `POST {baseUrl}/videos` with a raw `fetch` (the OpenAI SDK does not have a `videos` resource). Body: `model`, `prompt`, optional `image` (image-to-video), `mode` (`'ti2vid'` or `'keyframes'`), `height`, `width`, `numFrames` (≤441, `8n+1`), `frameRate`, `seed`, `negativePrompt`, and `extra_body.image` + `extra_body.mode` for keyframes.
  - Return `{ taskId, videoId, status, seconds, size }` from the create response.
- Add `getVideoResult(videoId, modelName?)`:
  - Call `GET {baseUrl}/agnesapi?video_id=<videoId>` with `Authorization: Bearer` via raw `fetch`.
  - On `status === 'completed'`, return `{ status, url, seconds }`. On `status === 'failed'`, throw with the upstream `error` message. On `queued`/`in_progress`, return the status so the controller can hand the polling loop back to the caller.
- Do **not** block the HTTP create response on generation. The controller exposes both create and poll endpoints; the frontend will fire-and-poll. This matches the existing project pattern of "no background jobs for user-triggered long work" (the only cron is the nightly health check and the daily retention cleanup).

Verification:

- `npm.cmd run build`.
- `POST /llm/video/generate` with text-to-video returns a `taskId` + `videoId` quickly.
- `GET /llm/video/:videoId` initially returns `status: 'queued' | 'in_progress'`, then `status: 'completed'` with a `.mp4` URL after a few seconds.
- Image-to-video (`image` body field) and keyframe mode (`extra_body.mode: 'keyframes'`) also return URLs.

### Phase 5 - Controller endpoints + Swagger

Files touched:

- `backend/src/modules/llm/llm.controller.ts`
- `backend/src/modules/llm/dto/` (new DTOs: `GenerateImageDto`, `CreateVideoTaskDto`, `VideoIdParamDto`, query DTO for `modelName`)
- `backend/swagger-spec.json` (update if generated manually; otherwise rely on NestJS Swagger regeneration at boot)

Endpoints (all `JwtAuthGuard`; no admin-only restriction — any authenticated user can call):

- `POST /llm/image/generate` — body `{ modelId?: number, prompt: string, size: string, ratio?: string, image?: string | string[], returnBase64?: boolean, providerOverride?: string }` → `{ url?: string, b64Json?: string, mimeType?: string, size?: string }`. Resolves provider/model via `resolveEffectiveModel` if `modelId` is omitted (if `modelId` is omitted and no user default is an image model, default to the first active `capability: 'image'` model from `findProviders`).
- `POST /llm/video/generate` — body `{ modelId?: number, prompt: string, image?: string, mode?: 'ti2vid' | 'keyframes', height?: number, width?: number, numFrames?: number, frameRate?: number, seed?: number, negativePrompt?: string }` → `{ taskId, videoId, status, seconds, size }`.
- `GET /llm/video/:videoId` — query `modelId?` → `{ status, url?, error?, seconds? }` (pollable). Reuse the same model resolution rules.
- Keep `POST /llm/models/:id/test`, `DELETE /llm/test-results/:id`, `POST /llm/set-default-model`, and `GET /llm/default-model` unchanged.
- Add full Swagger decorators (`@ApiOperation` with summary + description, `@ApiBearerAuth`, `@ApiOkResponse` / `@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse` with "Not applicable for this endpoint.", `@ApiNotFoundResponse` for 404s, `@ApiInternalServerErrorResponse`, `@ApiParam`, `@ApiBody` with JSON example) per the project NestJS rules.

Verification:

- `npm.cmd run build`.
- `http://localhost:3000/api` (Swagger UI) lists the new endpoints with the documented request/response shapes.

### Phase 6 - Capability-aware frontend model options

Files touched:

- `frontend/src/app/core/services/llm-provider.service.ts` (extend `LlmModel` to include `capability`; drop the now-dead `isDefault: boolean` field)
- `frontend/src/app/core/store/llm-provider.store.ts` (no shape change — the field flows through from the existing `findAll` call)
- `frontend/src/app/features/chat/chat/chat.ts` and `chat.html` (filter the chat dropdown to `capability === 'text'` so image/video models do not appear as selectable chat targets)

Tasks:

- Add `capability: 'text' | 'image' | 'video'` to the `LlmModel` interface. Remove the now-dead `isDefault: boolean` field (Phase 1 already removed it from the backend; the interface is stale and will silently desync otherwise).
- Chat model dropdown already iterates `llmProviderStore.providers()` and flattens `models`. Add a computed `chatModels` that filters by `m.capability === 'text'`, and bind the `<p-dropdown>` to that. This is one place to filter; other call sites (model default, providers-management) do not need to change because they show all models anyway.
- The frontend media studio (image/video UI) is **out of scope** for this plan per the original scope — only the backend endpoints are added. Document the deferred UI work in HANDOFF.

Verification:

- `npx ng build` from `frontend/`.
- Selecting a provider that has an image model still shows the text model in the chat dropdown; the image/video models are not selectable as chat targets.
- `rg "isDefault" frontend/src` returns no matches after Phase 6.

## API Contract (summary)

```
POST /llm/image/generate
  { modelId?, prompt, size, ratio?, image?, returnBase64?, providerOverride? }
  -> { url?: string, b64Json?: string, mimeType?: string, size?: string }

POST /llm/video/generate
  { modelId?, prompt, image?, mode?, height?, width?, numFrames?, frameRate?, seed?, negativePrompt? }
  -> { taskId, videoId, status, seconds, size }

GET /llm/video/:videoId?modelId=<optional>
  -> { status, url?, error?, seconds? }
```

Auth: `Authorization: Bearer <JWT>` (user). The backend attaches `Authorization: Bearer <AGNES_API_KEY>` to Agnes upstream calls. Both share the same `LlmClientService.getClient` → OpenAI SDK or raw `fetch` boundary.

## Key Agnes API Rules (from reference docs)

- Base URL: `https://apihub.agnes-ai.com/v1` (NOT the legacy `https://api.agnes.ai/v1` — the seed currently uses the wrong one).
- Auth: `Authorization: Bearer <API_KEY>` on every request.
- Images endpoint: `POST /v1/images/generations`, OpenAI-compatible.
  - `response_format` MUST be inside `extra_body`, never top-level (causes `400`).
  - Image-to-image: input images via `extra_body.image` (array of URLs or Data URI Base64). No `tags: ["img2img"]`.
  - `agnes-image-2.1-flash`: prefer tier `size` (`'1K' | '2K' | '3K' | '4K'`) + `ratio` (`'1:1' | '16:9' | ...`); exact sizes like `1024x768` are also accepted.
  - Client timeout 60s–360s.
- Video endpoint: async.
  - Create: `POST /v1/videos`.
  - Result: `GET /agnesapi?video_id=<VIDEO_ID>` (preferred) or legacy `GET /v1/videos/<TASK_ID>`.
  - `num_frames` ≤ 441 and follows `8n+1`; `seconds = num_frames / frame_rate`.
  - Statuses: `queued` → `in_progress` → `completed` / `failed`.
- All 4 models are currently free (`$0`), but treat pricing as subject to change (do not hardcode "free" assumptions in UI copy).

## Risks / Open Questions

- **OpenAI SDK image compatibility**: Agnes `images/generations` is documented as OpenAI-compatible, but the `extra_body.response_format` / `extra_body.image` quirk is non-standard. If `client.images.generate` rejects these, fall back to a raw `fetch` to `baseUrl/images/generations`. Decide after a live smoke test in Phase 3.
- **Provider key reconciliation**: existing DB may have an `agnes` row from the old seed. Phase 1 must update that row in place (`key` → `agnes-ai`, `baseUrl` → apihub URL, re-link models) rather than delete + reinsert, to keep model FK rows intact. Verify with `SELECT key, baseUrl FROM llm_providers` after deployment.
- **Admin guard**: confirmed image/video endpoints are authenticated-only (any user with a valid JWT), mirroring the existing `POST /llm/models/:id/test` policy. Rate limiting is out of scope for v1.
- **Video polling ownership**: backend polls on demand per `GET /llm/video/:videoId`. No background job in v1. If the frontend never polls (closed tab), the upstream `video_id` is effectively abandoned — acceptable for free-tier models.
- **Stale `isDefault` field**: the frontend `LlmModel` interface still declares `isDefault: boolean` even though the backend removed it in 2026-07-18. Phase 6 cleans this up; flagged as a follow-up so it does not get lost.
- **Reconciliation idempotency**: the seed currently uses `findOne({ where: { key } })` and only inserts if the row is missing. Phase 1's reconciliation must use `findOne({ where: [{ key: 'agnes' }, { key: 'agnes-ai' }] })` and update whichever row matches, otherwise a re-run on a freshly-renamed DB is a no-op (good) but the first run on an existing old DB will fail on a unique-key collision when the new insert tries to add `agnes-ai`. The reconcile step must come before the insert.
- **Nightly cron noise**: without Phase 2's health-check guard, the existing nightly test will mark every image/video model as failed and fill the `llm_model_test_results` table with noise rows. Phase 2 fixes this; flagged as a hard prerequisite for Phase 1, not a nice-to-have.

## Testing Checklist

Backend:

- `npm.cmd run build`.
- `llm_providers` has exactly one `agnes-ai` row with `baseUrl = 'https://apihub.agnes-ai.com/v1'`; `llm_models` has 4 Agnes rows with correct `capability`.
- `agnes-2.0-flash` chat still works (regression).
- `POST /llm/models/:id/test` on an `image` model returns 400; on the chat model it still records a result.
- `POST /llm/image/generate` with `agnes-image-2.0-flash` returns a URL (text-to-image) and edited result (image-to-image).
- `agnes-image-2.1-flash` with `size: '2K'`, `ratio: '16:9'` returns a `2624x1472` image.
- `POST /llm/video/generate` returns a `videoId`; `GET /llm/video/:videoId` eventually returns a `.mp4` URL.
- Sending an `image` model to the chat path throws a clear "not a text model" error (no silent misroute).
- `response_format` placed in `extra_body` (no `400` from a top-level `response_format`).

Frontend:

- `npx ng build`.
- Chat dropdown only lists `capability === 'text'` models.
- `rg "isDefault" frontend/src` returns no matches after Phase 6.

Manual:

- Set `AGNES_API_KEY` in `backend/.env`; restart backend (synchronize applies schema + seed).
- Run one image + one video generation end-to-end via curl/Swagger.
- Visually check the chat dropdown hides image/video models.

## Files Likely Touched

- `backend/src/core/seeds/llm-providers.seed.ts`
- `backend/src/modules/llm-provider/entities/llm-model.entity.ts`
- `backend/src/modules/llm-provider/dto/create-llm-model.dto.ts`
- `backend/src/modules/llm-provider/dto/update-llm-model.dto.ts`
- `backend/src/modules/llm/types/llm.types.ts`
- `backend/src/modules/llm/services/llm-client.service.ts`
- `backend/src/modules/llm/services/llm-tasks.service.ts` (only if we want to guard the cron)
- `backend/src/modules/llm/services/llm-health.service.ts` (guard the nightly cron + per-model test)
- `backend/src/modules/llm/llm.controller.ts`
- `backend/src/modules/llm/llm.service.ts`
- `backend/src/modules/llm/dto/*` (new)
- `backend/swagger-spec.json`
- `frontend/src/app/core/services/llm-provider.service.ts`
- `frontend/src/app/features/chat/chat/chat.ts`
- `frontend/src/app/features/chat/chat/chat.html`
- `documents/HANDOFF.md`
- `documents/STATUS.md`
- `documents/architecture-diagram.md` (only if the new endpoints cross an existing module boundary — they do not, they live entirely inside `LlmModule`, so no diagram update is needed)

## Out of Scope (deferred follow-up)

- Frontend media studio page for picking an `image`/`video` capability model, sending the request, and polling the result. Plan notes this in the original target model section.
- File upload to a temporary blob store so the frontend can reference uploaded images via URL rather than Base64 inline. The current plan accepts Base64 Data URIs in `image` to keep the API stateless.
- Streaming token-by-token for image generation. Image generation does not stream; the result is a single URL.
- Background job retries for failed video tasks. v1 lets the user re-create the task; v2 can add a retry endpoint.
