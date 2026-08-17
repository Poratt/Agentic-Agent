# ServiceResultContainer Conformance Audit

**Date:** 2026-08-17 · **Scope:** all 76 endpoints in 15 backend controllers (`backend/src/modules/*/[name].controller.ts`)
**Method:** handler-by-handler inspection of return statements + service method return types + response DTO definitions. `ServiceResultContainer` = `{ success, message, result, error?, retryAfter?, statusCode? }` (`backend/src/core/models/service-result-container.model.ts`).

Legend: ✅ conform (typed container / container-shaped DTO / inline `{success,message,result}`) · ⚠️ partial (some fields missing or inconsistent shape) · ❌ non-conform (raw payload) · 🔵 justified exception (documented: SSE / 204 / OAuth redirect)

## Summary

| Verdict | Count | Notes |
|---|---|---|
| ✅ Conform (incl. 🔵 justified) | 70 | of which 6 are documented exceptions: 2×SSE (ideas stream, admin-agent query-stream), 3×HTTP-204 empty-body deletes, 1×OAuth redirect (calendar /auth) |
| ⚠️ Partial | **0 — fixed 2026-08-17** | confirm-action now returns `{success, message, result}` in both branches; ideas favorite + mark-read are now HTTP-204 (matching their delete siblings); frontend chat.service type updated |
| ❌ Non-conform | **0 — all wrapped 2026-08-17** | admin-agent×4 (2b7eeda), calendar×3 (b805b42), llm×4 (3ebe770), ideas×3 (1aa5348 + unread-count), strain-hunter×3 (ee5938d) |

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
| google-calendar | GET /events | ✅ | container; Google Schema$Event array verbatim under result |
| google-calendar | POST /events | ✅ | container; Google event under result |
| google-calendar | DELETE /events | ✅ | inline `{success,message}` |
| google-calendar | PATCH /events | ✅ | container; Google event under result |
| ideas | POST /generate | ✅ | `GenerateIdeasResponse` = container superset (`success,message,partial,result`) |
| ideas | GET /generate/stream | 🔵 | SSE progress events — documented |
| ideas | GET /sessions | ✅ | wrapped 2026-08-17 (1aa5348): `{success, message, result}` |
| ideas | GET /sessions/:id | ✅ | wrapped 2026-08-17 (1aa5348) |
| ideas | DELETE /sessions/:id | 🔵 | HTTP 204, empty body — documented |
| ideas | PATCH /ideas/:id (favorite) | ✅ | HTTP 204 (fixed 2026-08-17) |
| ideas | GET /nightly/unread-count | ✅ | wrapped 2026-08-17: `{success, message, result: count}` |
| ideas | POST /nightly/mark-read | ✅ | HTTP 204 (fixed 2026-08-17) |
| ideas | POST /nightly/trigger | ✅ | inline `{success,message}` |
| llm | POST /models/:id/test | ✅ | `ServiceResultContainer<…>` via healthService |
| llm | DELETE /test-results/:id | ✅ | `ServiceResultContainer<void>` |
| llm | POST /set-default-model | ✅ | inline `{success,message}` |
| llm | GET /default-model | ✅ | inline `{success,message,result}` |
| llm | POST /image/generate | ✅ | container; b64Json payload unchanged under result |
| llm | POST /video/generate | ✅ | container; task object under result |
| llm | GET /video/:videoId | ✅ | container; status object under result |
| llm | POST /video/extend | ✅ | container; LLM-agent-only consumer (no frontend usage) |
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
| strain-hunter | GET /fetch | ✅ | wrapped 2026-08-17: `{success, message, result: {items, lastScrapedAt}}` |
| strain-hunter | GET /preferences | ✅ | wrapped 2026-08-17: `{success, message, result: {prefs, weights}}` |
| strain-hunter | PUT /preferences | ✅ | wrapped 2026-08-17: `{success, message, result: {prefs, weights}}` |
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
2. **All 17 non-conform endpoints wrapped 2026-08-17** (5 clusters: admin-agent sessions, google-calendar events, llm image/video, ideas reads + unread-count, strain-hunter fetch/preferences). Zero non-conform remaining.
3. **All 3 partial endpoints resolved 2026-08-17** — confirm-action returns full container; ideas favorite + mark-read are HTTP-204 matching their delete siblings.
4. Frontend impact unknown from this audit — changing ❌ endpoints to containers is a **breaking change** for every consumer; any migration needs a coordinated frontend sweep.

### Recommendation (not applied)
- Lowest-risk fix first: the 3 ⚠️ endpoints (align to 204 or add container).
- Leave 🔵 exceptions as-is (documented by design).
- The 17 ❌ endpoints: wrap in containers only as part of a planned API-version bump with frontend updates in the same change.
