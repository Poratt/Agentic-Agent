# ServiceResultContainer Conformance Audit

**Date:** 2026-08-17 · **Scope:** all 76 endpoints in 15 backend controllers (`backend/src/modules/*/[name].controller.ts`)
**Method:** handler-by-handler inspection of return statements + service method return types + response DTO definitions. `ServiceResultContainer` = `{ success, message, result, error?, retryAfter?, statusCode? }` (`backend/src/core/models/service-result-container.model.ts`).

Legend: ✅ conform (typed container / container-shaped DTO / inline `{success,message,result}`) · ⚠️ partial (some fields missing or inconsistent shape) · ❌ non-conform (raw payload) · 🔵 justified exception (documented: SSE / 204 / OAuth redirect)

## Summary

| Verdict | Count | Notes |
|---|---|---|
| ✅ Conform (incl. 🔵 justified) | 63 | of which 6 are documented exceptions: 2×SSE (ideas stream, admin-agent query-stream), 3×HTTP-204 empty-body deletes, 1×OAuth redirect (calendar /auth) |
| ⚠️ Partial | **0 — fixed 2026-08-17** | confirm-action now returns `{success, message, result}` in both branches; ideas favorite + mark-read are now HTTP-204 (matching their delete siblings); frontend chat.service type updated |
| ❌ Non-conform | 13 | google-calendar×3 (events passthrough), ideas×3 (session reads + unread-count), llm×4 (image/video passthrough), strain-hunter×3 |

**Total: 76 endpoints / 15 controllers.**

## Per-endpoint table

| Module | Endpoint | Verdict | Note |
|---|---|---|---|
| admin-agent | GET /sessions | ✅ | wraps in ServiceResultContainer (controller-level) |
| admin-agent | GET /sessions/:id/messages | ✅ | container + header preserved |
| admin-agent | POST /messages/images | ✅ | wraps map in container |
| admin-agent | POST /sessions | ✅ | wraps in container |
| admin-agent | DELETE /sessions/:id | 🔵 | HTTP 204, empty body — documented |
| admin-agent | DELETE /sessions/:sessionId/messages/:messageId | 🔵 | HTTP 204, empty body — documented |
| admin-agent | POST /query-stream | 🔵 | SSE (text/event-stream, NDJSON events) — documented |
| admin-agent | POST /confirm-action | ⚠️ | `{success, result}` or `{success, cancelled}` — has `success` but no `message`, two different shapes |
| analytics | POST /query | ✅ | `ServiceResultContainer<AnalyticsQueryResponseDto>` |
| auth | POST /register | ✅ | `ServiceResultContainer<UserResponseDto>` |
| auth | POST /login | ✅ | idem |
| auth | POST /refresh | ✅ | idem |
| auth | POST /logout | ✅ | `ServiceResultContainer<{ok:true}>` |
| auth | GET /me | ✅ | inline container with JwtPayload |
| currency | GET /current | ✅ | `ServiceResultContainer<CurrencyRatesResponseDto \| null>` |
| currency | GET /convert | ✅ | `ServiceResultContainer<CurrencyConversionResponseDto \| null>` |
| database-monitor | GET /storage | ✅ | `ServiceResultContainer<DatabaseStorageSummaryDto>` |
| genetics | GET / | ✅ | `GeneticsListResultResponseDto implements ServiceResultContainer` |
| genetics | GET /:name | ✅ | `GeneticsResultResponseDto implements ServiceResultContainer` |
| genetics | POST / | ✅ | idem |
| genetics | PATCH /:name | ✅ | idem |
| genetics | POST /:name/enrich | ✅ | inline `{success,message,result}` |
| genetics | POST /enrich-missing | ✅ | inline `{success,message,result}` |
| genetics | DELETE /:name | ✅ | inline `{success,message}` (no result — deletion) |
| google-calendar | GET /auth | 🔵 | OAuth redirect flow — returns `{url, state}` raw by design |
| google-calendar | GET /callback | ✅ | inline `{success,message}` |
| google-calendar | GET /events | ❌ | raw Google Calendar event array |
| google-calendar | POST /events | ❌ | raw `res.data` (Google event) |
| google-calendar | DELETE /events | ✅ | inline `{success,message}` |
| google-calendar | PATCH /events | ❌ | raw `res.data` (Google event) |
| ideas | POST /generate | ✅ | `GenerateIdeasResponse` = container superset (`success,message,partial,result`) |
| ideas | GET /generate/stream | 🔵 | SSE progress events — documented |
| ideas | GET /sessions | ❌ | raw `SavedIdeaSession[]` |
| ideas | GET /sessions/:id | ❌ | raw `SavedIdeaSession` |
| ideas | DELETE /sessions/:id | 🔵 | HTTP 204, empty body — documented |
| ideas | PATCH /ideas/:id (favorite) | ⚠️ | `await` only — 200 with empty body (no container, not 204) |
| ideas | GET /nightly/unread-count | ❌ | raw number |
| ideas | POST /nightly/mark-read | ⚠️ | `await` only — 201 with empty body (no container) |
| ideas | POST /nightly/trigger | ✅ | inline `{success,message}` |
| llm | POST /models/:id/test | ✅ | `ServiceResultContainer<…>` via healthService |
| llm | DELETE /test-results/:id | ✅ | `ServiceResultContainer<void>` |
| llm | POST /set-default-model | ✅ | inline `{success,message}` |
| llm | GET /default-model | ✅ | inline `{success,message,result}` |
| llm | POST /image/generate | ❌ | raw `{url/b64Json/mimeType/size, model}` — upstream passthrough |
| llm | POST /video/generate | ❌ | raw task object passthrough |
| llm | GET /video/:videoId | ❌ | raw status object passthrough |
| llm | POST /video/extend | ❌ | raw continuation object passthrough |
| llm-provider | POST / | ✅ | typed container |
| llm-provider | GET / | ✅ | typed container |
| llm-provider | PATCH /:id | ✅ | typed container |
| llm-provider | POST /:id/models | ✅ | typed container |
| llm-provider | PATCH /models/:id | ✅ | typed container |
| llm-provider | DELETE /models/:id | ✅ | typed container |
| llm-provider | DELETE /models/:modelId/test-results | ✅ | typed container |
| llm-provider | GET /:id/models | ✅ | typed container |
| llm-provider | POST /cleanup-test-results | ✅ | inline `{success,message,result}` |
| llm-provider | GET /test-results | ✅ | typed container |
| strain-hunter | GET /fetch | ❌ | raw `{items, lastScrapedAt}` |
| strain-hunter | GET /preferences | ❌ | raw `{prefs, weights}` |
| strain-hunter | PUT /preferences | ❌ | raw `{prefs, weights}` |
| system | GET /status | ✅ | `ServiceResultContainer<SystemStatusDto>` |
| terpene | GET / | ✅ | `TerpeneListResultResponseDto implements ServiceResultContainer` |
| terpene | GET /:name | ✅ | `TerpeneResultResponseDto implements ServiceResultContainer` |
| terpene | POST / | ✅ | idem |
| terpene | PATCH /:name | ✅ | idem |
| terpene | POST /:name/enrich | ✅ | inline `{success,message,result}` |
| terpene | POST /enrich-missing | ✅ | inline `{success,message,result}` |
| terpene | DELETE /:name | ✅ | inline `{success,message}` |
| users | GET / | ✅ | `ServiceResultContainer<UserResponseDto[]>` |
| users | GET /me | ✅ | inline container (JwtPayload) |
| users | GET /:id | ✅ | `ServiceResultContainer<UserResponseDto>` |
| users | PATCH /:id | ✅ | idem |
| users | DELETE /:id | ✅ | `ServiceResultContainer<{deleted:boolean}>` |
| users | PATCH /:id/role | ✅ | `ServiceResultContainer<UserResponseDto>` |
| web-search | GET /search | ✅ | `ServiceResultContainer<WebSearchResultDto \| null>` |

## Findings

1. **Core pattern is healthy** — 56/76 (74%) conform, and every module added recently (llm-provider, genetics, terpene, analytics, currency, system, database-monitor) conforms via typed DTOs that `implements ServiceResultContainer`.
2. **17 non-conform endpoints cluster in 5 groups**, all returning upstream/domain payloads raw: admin-agent session CRUD (ChatSession/ChatMessage entities), google-calendar events passthrough (Google API objects), llm image/video passthrough, ideas session reads, strain-hunter preferences/fetch.
3. **3 partial endpoints** return success-shaped objects missing `message` or an empty body on a 200/201 (ideas favorite/mark-read could just be 204s like their delete siblings).
4. Frontend impact unknown from this audit — changing ❌ endpoints to containers is a **breaking change** for every consumer; any migration needs a coordinated frontend sweep.

### Recommendation (not applied)
- Lowest-risk fix first: the 3 ⚠️ endpoints (align to 204 or add container).
- Leave 🔵 exceptions as-is (documented by design).
- The 17 ❌ endpoints: wrap in containers only as part of a planned API-version bump with frontend updates in the same change.
