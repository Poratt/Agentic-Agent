# Agnes AI Multimodal Integration Plan

## Goal

Make all 4 Agnes AI models usable through the existing LLM backend, not just the chat model.

The Agnes AI provider exposes:

1. `agnes-2.0-flash` — text chat / reasoning (OpenAI-compatible `chat.completions`).
2. `agnes-image-2.0-flash` — image generation & editing (`POST /v1/images/generations`).
3. `agnes-image-2.1-flash` — upgraded image generation, tier-based sizes + ratios.
4. `agnes-video-v2.0` — asynchronous video generation (`POST /v1/videos` + poll `GET /agnesapi?video_id=`).

Today only #1 works because `LlmClientService` only calls `client.chat.completions.create`, and the provider seed is mis-keyed so even the chat model may not resolve. This plan adds image + video generation and fixes the provider wiring so all 4 models resolve and dispatch correctly.

## Current State (verified against repo)

- `backend/src/modules/llm/llm-provider-config.service.ts:5` lists `agnes-ai` as a provider id; `:82-89` returns `baseUrl: AGNES_BASE_URL ?? 'https://apihub.agnes-ai.com/v1'` and `model: AGNES_MODEL ?? 'agnes-2.0-flash'`.
- `backend/src/modules/llm/services/llm-client.service.ts` builds an OpenAI SDK client from the DB provider row and only calls `client.chat.completions.create` (sync + stream). No image/video path.
- `backend/src/core/seeds/llm-providers.seed.ts:46-51` already defines `AGNES_AI_MODELS` with all 4 models, BUT `:119-146` seeds them under provider **key `agnes`** with `baseUrl: 'https://api.agnes.ai/v1'`.
  - **Bug**: `LlmProviderConfigService` and `LlmClientService` look up provider key **`agnes-ai`**, not `agnes`. `resolveEffectiveModel` → `findProviderByKey('agnes-ai')` will not find the seeded `agnes` row. The Agnes chat model is effectively unreachable through the DB path.
- `LlmModelEntity` (`backend/src/modules/llm-provider/entities/llm-model.entity.ts`) has no capability/type field. Chat, image, and video models are indistinguishable, so the client cannot decide which API to call.
- `LlmProviderService.resolveEffectiveModel` (`backend/src/modules/llm-provider/llm-provider.service.ts:40`) resolves `provider + model` via `user_llm_defaults` → legacy env. For Agnes image/video, the model key (`agnes-image-2.0-flash` etc.) is already in the DB, so resolution works once the provider key is fixed.
- Auth: `agnes-ai` uses `Authorization: Bearer <AGNES_API_KEY>`; OpenAI SDK already sends `Authorization: Bearer` from `apiKey`. The Agnes image endpoint is OpenAI-compatible enough to call through `client.images.generate` (needs verification — see Risks).

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

### Provider key fix

Change the seed (and any config fallback) so the Agnes provider uses key **`agnes-ai`** with `baseUrl: 'https://apihub.agnes-ai.com/v1'` to match `LlmProviderConfigService`. Existing mis-keyed `agnes` rows must be reconciled (see Phase 1).

## Backend Implementation Phases

### Phase 1 - Fix provider seed + add capability field

Files touched:

- `backend/src/core/seeds/llm-providers.seed.ts`
- `backend/src/modules/llm-provider/entities/llm-model.entity.ts`
- `backend/src/modules/llm/types/llm.types.ts` (add `LlmModelCapability` union)
- DB: `synchronize: true` drops/creates columns automatically (no manual migration needed, consistent with current approach).

Tasks:

- Change seed Agnes block to use `key: 'agnes-ai'`, `baseUrl: process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1'`.
- Handle the existing `agnes` row already in DB: either update its `key`/`baseUrl` in the seed upsert, or delete-then-reseed. Prefer an idempotent upsert that maps old `agnes` → `agnes-ai` (update key + baseUrl + re-link models) to avoid orphaned models.
- Add `capability` enum to `LlmModelEntity` and set it for the 4 Agnes models in the seed.
- For other providers (openrouter, nvidia, ollama), default `capability: 'text'`.

Verification:

- `npm run build` from `backend/`.
- `SHOW COLUMNS FROM llm_models` shows `capability` enum; `llm_providers` has one `agnes-ai` row (no duplicate `agnes`).
- A `GET /llm/model-options` (or direct DB read) returns the 4 Agnes models with correct capability.

### Phase 2 - Image generation client path

Files touched:

- `backend/src/modules/llm/services/llm-client.service.ts`
- `backend/src/modules/llm/types/llm.types.ts` (add `LlmImageRequest` / `LlmImageResult`)
- `backend/src/modules/llm/llm.controller.ts` (new endpoint, see API contract)
- `backend/src/modules/llm/llm.service.ts` (wire controller → client)

Tasks:

- Add `generateImage(request)` to `LlmClientService`:
  - Resolve provider/model via `resolveEffectiveModel` (provider `agnes-ai`).
  - Read `capability` from the resolved model; if not `image`, throw a clear error.
  - Build OpenAI `images.generate` call:
    - `model: activeModel`
    - `prompt`
    - `size` (required). For `agnes-image-2.1-flash`, also support `extra_body.ratio` and tier sizes (`1K`–`4K`); map `size`/`ratio` into the request, with `response_format` placed inside `extra_body` (Agnes-specific quirk — not a standard OpenAI field).
    - `image` (image-to-image / multi-image) passed via `extra_body.image` (array of URLs or Data URI Base64).
    - `return_base64` → `response_format: 'b64_json'` path.
  - Return `{ url?, b64_json? }` from `data[0]`.
- Use the existing OpenAI client (`client.images.generate`) where compatible; if Agnes diverges, call `fetch` against `baseUrl/images/generations` with `Authorization: Bearer`. PREFER the OpenAI SDK call first; fall back to raw `fetch` only if the SDK shape mismatches (verify in Risks).
- Apply the same `withRetry` wrapper used by chat (503/502 retryable).

Verification:

- `npm run build`.
- Manual curl via new endpoint: text-to-image `agnes-image-2.0-flash` returns a URL; image-to-image with `extra_body.image` returns edited result; `agnes-image-2.1-flash` with `size: '2K'`, `ratio: '16:9'` returns `2624x1472`.

### Phase 3 - Video generation client path (async)

Files touched:

- `backend/src/modules/llm/services/llm-client.service.ts` (add `generateVideo` + `getVideoResult`)
- `backend/src/modules/llm/services/llm-tasks.service.ts` (reuse async-task pattern if present; otherwise add a small poller)
- `backend/src/modules/llm/types/llm.types.ts` (add `LlmVideoRequest` / `LlmVideoTask` / `LlmVideoResult`)
- `backend/src/modules/llm/llm.controller.ts` (new endpoints)

Tasks:

- Add `createVideoTask(request)`:
  - Resolve provider/model (`agnes-ai`, `agnes-video-v2.0`); verify `capability === 'video'`.
  - `POST {baseUrl}/videos` with body: `model`, `prompt`, optional `image` (image-to-video), `mode` (`ti2vid` / `keyframes`), `height`, `width`, `num_frames` (≤441, `8n+1`), `frame_rate`, `seed`, `negative_prompt`, `extra_body.image` + `extra_body.mode` for keyframes.
  - Return `{ taskId, videoId, status, seconds, size }` from the create response.
- Add `getVideoResult(videoId, modelName?)`:
  - `GET {baseUrl}/agnesapi?video_id=<videoId>` (preferred) with `Authorization: Bearer`.
  - Poll until `status === 'completed'` (return `url`) or `failed` (throw with `error`).
  - Recommended poll interval 3–5s, overall timeout ~360s (matches image-gen timeout guidance).
- Do NOT block the HTTP response on generation; expose create + poll endpoints (fire-and-poll UX on frontend later).

Verification:

- `npm run build`.
- Manual: create text-to-video task → get `video_id` → poll → receive `.mp4` URL. Image-to-video and keyframe (`extra_body.mode: 'keyframes'`) also return URLs.

### Phase 4 - Controller endpoints + Swagger

Files touched:

- `backend/src/modules/llm/llm.controller.ts`
- `backend/src/modules/llm/dto/` (new DTOs)
- `backend/swagger-spec.json` (update if generated manually)

Endpoints (all `JwtAuthGuard`; admin-only optional — match existing `/llm/admin/*` convention):

- `POST /llm/image/generate` — body `{ modelId?, prompt, size, ratio?, image?, returnBase64?, providerOverride? }` → `{ url?, b64_json? }`.
- `POST /llm/video/generate` — body `{ modelId?, prompt, image?, mode?, height?, width?, numFrames?, frameRate?, seed?, negativePrompt? }` → `{ taskId, videoId, status, seconds, size }`.
- `GET /llm/video/:videoId` — query `modelName?` → `{ status, url?, error? }` (pollable).
- Keep `POST /llm/set-default-model` and `GET /llm/default-model` unchanged.
- Add Swagger `@ApiOperation` / `@ApiResponse` to match `nestjs-controller` skill conventions.

Verification:

- `npm run build`.
- Swagger spec reflects new endpoints (or documented as manually-maintained).

### Phase 5 - Capability-aware model options

Files touched:

- `backend/src/modules/llm/services/llm-model-catalog.service.ts` (or wherever `GET /llm/model-options` is built)
- `frontend/src/app/core/services/llm.service.ts` (extend `ModelOption` shape if needed)

Tasks:

- Include `capability` in the model-options response so the frontend can show image/video models in the right UI and avoid offering them in the chat text box.
- Keep the existing grouped `{ label, items: [{ id, provider, value, label }] }` shape; add `capability` per item.

Verification:

- `npm run build` + `npx ng build`.
- `GET /llm/model-options` returns `capability` per model.

## API Contract (summary)

```
POST /llm/image/generate
  { modelId?, prompt, size, ratio?, image?, returnBase64?, providerOverride? }
  -> { url?: string, b64_json?: string }

POST /llm/video/generate
  { modelId?, prompt, image?, mode?, height?, width?, numFrames?, frameRate?, seed?, negativePrompt? }
  -> { taskId, videoId, status, seconds, size }

GET /llm/video/:videoId?modelName=agnes-video-v2.0
  -> { status, url?, error? }
```

Auth: `Authorization: Bearer <JWT>` (user) + backend attaches `Authorization: Bearer <AGNES_API_KEY>` to Agnes upstream calls.

## Frontend (out of scope for first pass, noted for later)

- A media studio page (`/media` or within chat) that:
  - lets the user pick an `image`/`video` capability model,
  - sends `POST /llm/image/generate` or `POST /llm/video/generate`,
  - polls `GET /llm/video/:videoId` and renders the result.
- Chat text box continues to use only `capability: 'text'` models.
- This plan covers backend enablement; frontend media UI is a follow-up task.

## Key Agnes API Rules (from reference docs)

- Base URL: `https://apihub.agnes-ai.com/v1`.
- Auth: `Authorization: Bearer <API_KEY>` on every request.
- Images endpoint: `POST /v1/images/generations`, OpenAI-compatible.
  - `response_format` MUST be inside `extra_body`, never top-level (causes `400`).
  - Image-to-image: input images via `extra_body.image` (array). No `tags: ["img2img"]`.
  - `agnes-image-2.1-flash`: prefer tier `size` (`1K`–`4K`) + `ratio` (`1:1`, `16:9`, …); exact sizes like `1024x768` also accepted but may be normalized.
  - Client timeout 60s–360s.
- Video endpoint: async.
  - Create: `POST /v1/videos`.
  - Result: `GET /agnesapi?video_id=<VIDEO_ID>` (preferred) or legacy `GET /v1/videos/<TASK_ID>`.
  - `num_frames` ≤ 441 and follows `8n+1`; `seconds = num_frames / frame_rate`.
  - Statuses: `queued` → `in_progress` → `completed` / `failed`.
- All 4 models are currently free (`$0`), but treat pricing as subject to change (do not hardcode "free" assumptions in UI copy).

## Risks / Open Questions

- **OpenAI SDK image compatibility**: Agnes `images/generations` is documented as OpenAI-compatible, but the `extra_body.response_format` / `extra_body.image` quirk is non-standard. If `client.images.generate` rejects these, use a raw `fetch` to `baseUrl/images/generations`. Decide after a live smoke test in Phase 2.
- **Provider key reconciliation**: existing DB may have an `agnes` row from the old seed. Phase 1 must not create a second `agnes-ai` row or orphan the 4 models. Verify with `SELECT key FROM llm_providers` after deployment.
- **Admin guard**: confirm whether image/video endpoints need admin-only or just authenticated. Mirror the existing `/llm/admin/*` policy.
- **Video polling ownership**: backend polls on demand (per `GET /llm/video/:videoId`). No background job in v1.

## Testing Checklist

Backend:

- `npm run build`.
- `llm_providers` has exactly one `agnes-ai` row; `llm_models` has 4 Agnes rows with correct `capability`.
- `agnes-2.0-flash` chat still works (regression).
- `POST /llm/image/generate` with `agnes-image-2.0-flash` returns a URL (text-to-image) and edited result (image-to-image).
- `agnes-image-2.1-flash` with `size: '2K'`, `ratio: '16:9'` returns `2624x1472`.
- `POST /llm/video/generate` returns a `video_id`; `GET /llm/video/:videoId` eventually returns a `.mp4` URL.
- Sending an `image` model to the chat path throws a clear "not a text model" error (no silent misroute).
- `response_format` placed in `extra_body` (no `400`).

Manual:

- Set `AGNES_API_KEY` in `backend/.env`; restart backend (synchronize applies schema + seed).
- Run one image + one video generation end-to-end via curl/Swagger.

## Files Likely Touched

- `backend/src/core/seeds/llm-providers.seed.ts`
- `backend/src/modules/llm-provider/entities/llm-model.entity.ts`
- `backend/src/modules/llm/types/llm.types.ts`
- `backend/src/modules/llm/services/llm-client.service.ts`
- `backend/src/modules/llm/services/llm-tasks.service.ts` (polling, if reused)
- `backend/src/modules/llm/llm.controller.ts`
- `backend/src/modules/llm/llm.service.ts`
- `backend/src/modules/llm/dto/*` (new)
- `backend/swagger-spec.json`
- `frontend/src/app/core/services/llm.service.ts` (model-options capability field)
- `documents/features/todo/agnes-ai-multimodal-plan.md`
