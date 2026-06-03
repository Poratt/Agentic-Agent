# Backend Controllers / DTOs / Entities LLM Documentation Audit

## Scope

Static audit of backend documentation quality for:

- Controllers: `backend/src/app.controller.ts`, `backend/src/modules/*/*.controller.ts`
- DTOs: `backend/src/modules/**/dto/*.ts`
- Entities: `backend/src/**/entities/*.ts`, `backend/src/core/entities/*.ts`
- Related enum: `backend/src/core/enums/user-role.enum.ts`

The audit checks whether an LLM agent can safely understand:

- Which endpoints exist and what they do.
- Required authentication and authorization.
- Valid payloads and validation rules.
- Response shapes.
- Dangerous or irreversible side effects.
- Sensitive fields and how they should not be used.

## Executive Summary

Overall documentation level: **medium**.

Is it sufficient for an LLM agent? **Not for high-confidence autonomous use**.

The project has useful documentation in `AuthController`, `UsersController`, and several DTOs. However, it is not yet reliable as a source of truth for an LLM agent because:

- Several docs contain broken text encoding / mojibake around Hebrew text, arrows, and dash characters.
- Some controller documentation does not match the DTOs.
- Entity documentation is weak, especially for chat persistence.
- One response DTO is fully commented out.
- `UserRole` is numeric (`Admin = 1`, `User = 2`), while some docs describe string values such as `"admin" | "user"`.
- Several response shapes are described only in prose instead of explicit response DTOs.

An agent could use the current docs for basic navigation, but not for safe autonomous API operation.

## Scorecard

| Area | Score | Assessment |
|---|---:|---|
| Controllers | 7/10 | Good Swagger coverage in Auth/Users, medium in Admin Agent, basic in App |
| DTOs | 7/10 | Most input fields have Swagger and validation decorators, but some contracts drift |
| Entities | 3/10 | `User` is partially documented; chat entities are mostly undocumented |
| LLM readiness | 5/10 | Useful for orientation, not reliable enough for autonomous execution |
| Contract consistency | 4/10 | Several important inconsistencies across docs, DTOs, and enums |

## Findings

### 1. Broken Encoding in Documentation Text

Severity: High

Files:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/auth/dto/login.dto.ts`
- `backend/src/modules/users/dto/update-user.dto.ts`
- `backend/src/modules/users/dto/update-user-role.dto.ts`
- `backend/src/modules/admin-agent/entities/chat-session.entity.ts`
- `backend/src/core/enums/user-role.enum.ts`

Problem:

Several natural-language docs include mojibake. This affects JSDoc, Swagger descriptions, validation messages, enum labels, and default strings.

Why it matters for LLM agents:

LLM agents rely heavily on natural-language descriptions for intent, authorization hints, and safety warnings. Garbled text reduces retrieval quality and can cause the agent to miss important constraints.

Recommended fix:

Normalize affected files to valid UTF-8 and rebuild the Swagger spec after the fix.

### 2. Controller Documentation Is Strong but Not Uniform

Severity: Medium

Files:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/admin-agent/admin-agent.controller.ts`
- `backend/src/app.controller.ts`

What is good:

- `AuthController` and `UsersController` include endpoint-level JSDoc, `@ApiOperation`, response decorators, and authorization notes.
- JWT guards and admin-only routes are usually documented explicitly.
- `DELETE /users/:id` is documented as irreversible.

Gaps:

- `AdminAgentController` is less detailed than Auth and Users.
- `POST /admin-agent/query-stream` says it streams SSE-like output, but there is no explicit stream contract for chunks, errors, or completion.
- `GET /admin-agent/sessions?limit=` documents `limit`, but the controller does not use a query DTO or `ParseIntPipe`.
- Several responses are described as text instead of using explicit Swagger response DTOs.

LLM impact:

An agent can understand endpoint intent, but not always the exact returned structure or stream behavior.

### 3. DTO Documentation Is Mostly Good, but Has Contract Drift

Severity: High

Files:

- `backend/src/modules/auth/dto/register.dto.ts`
- `backend/src/modules/auth/dto/login.dto.ts`
- `backend/src/modules/users/dto/update-user.dto.ts`
- `backend/src/modules/users/dto/update-user-role.dto.ts`
- `backend/src/modules/admin-agent/dto/agent-request.dto.ts`
- `backend/src/modules/admin-agent/dto/agent-response.dto.ts`

What is good:

- Most input fields use `ApiProperty` / `ApiPropertyOptional`.
- Most input fields also have `class-validator` decorators.
- `RegisterDto` and `UpdateUserDto` document validation behavior and business-rule failures.

Problems:

- `AuthController` still describes `RegisterDto` as using optional `username` and password min 6, but `RegisterDto` actually requires `fullName` and password min 8.
- `AgentResponseDto` is fully commented out, so there is no active response contract.
- `UpdateUserDto` allows `role`, but `UsersController` says `PATCH /users/:id` should not change role and that role changes must use `PATCH /users/:id/role`.
- Role docs describe `"admin" | "user"` strings, but `UserRole` is numeric.

LLM impact:

An agent may send `username` instead of `fullName`, send a string role instead of a numeric enum value, or choose the wrong endpoint for role changes.

### 4. Entity Documentation Is Not Sufficient

Severity: High

Files:

- `backend/src/modules/users/entities/user.entity.ts`
- `backend/src/modules/admin-agent/entities/chat-message.entity.ts`
- `backend/src/modules/admin-agent/entities/chat-session.entity.ts`
- `backend/src/core/entities/app-setting.entity.ts`

What is good:

- `User` has `ApiProperty` on most fields.
- `User.password` is marked `writeOnly`.
- `AppSetting.id` is documented.

Problems:

- `ChatMessage` and `ChatSession` have almost no field-level Swagger or JSDoc documentation.
- Ownership rules are not documented: which user owns a session, who can read it, and what happens on delete.
- `ChatMessage.role` values (`user`, `assistant`, `tool`) are not explained.
- `toolCallId` is not explained.
- `sessionId` is nullable in TypeORM but typed as `number` in TypeScript instead of `number | null`.
- `ChatSession.title` has a garbled Hebrew default value.
- `User.refreshToken` is documented as a JWT refresh token; if the persisted value is a hash, the docs should say that explicitly.

LLM impact:

An agent cannot reliably infer persistence behavior, ownership constraints, cascade effects, or safe response boundaries from the entity layer.

### 5. Sensitive Fields Need Safer Public Response Boundaries

Severity: Medium

File:

- `backend/src/modules/users/entities/user.entity.ts`

Problem:

`password` and `refreshToken` are part of the entity documentation. Even if `password` is marked `writeOnly`, using persistence entities as public response types can confuse agents and generated clients.

Recommended fix:

Create explicit public response DTOs such as `UserResponseDto` and avoid using the persistence entity as the Swagger response type for public endpoints.

### 6. Response Shapes Are Under-Specified

Severity: Medium

Files:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/admin-agent/admin-agent.controller.ts`

Problem:

Several response shapes are documented only in text:

- `ServiceResultContainer<JwtPayload>` is described in prose, but Swagger sometimes points to `User`.
- Admin-agent sessions and messages do not have explicit response DTOs.
- Stream output does not have a clear documented event/chunk format.

LLM impact:

An agent can understand what to call, but cannot confidently generate a strict client, parser, or validation test suite from the current docs.

## File-Level Notes

| File | Documentation Level | Notes |
|---|---|---|
| `backend/src/modules/auth/auth.controller.ts` | High but inconsistent | Detailed, but has encoding issues and drift from `RegisterDto` |
| `backend/src/modules/users/users.controller.ts` | High but inconsistent | Good auth docs, but update-role behavior conflicts with `UpdateUserDto` |
| `backend/src/modules/admin-agent/admin-agent.controller.ts` | Medium | Endpoints are documented; stream/session response contracts are missing |
| `backend/src/app.controller.ts` | Adequate | Simple health endpoint is documented well enough |
| `backend/src/modules/auth/dto/register.dto.ts` | Good | Clear validation docs, but validation message text is garbled |
| `backend/src/modules/auth/dto/login.dto.ts` | Medium | Swagger and validation exist, but text has encoding issues |
| `backend/src/modules/users/dto/update-user.dto.ts` | Good but conflicting | Good field docs, but role support conflicts with controller docs |
| `backend/src/modules/users/dto/update-user-role.dto.ts` | Good but role type issue | Good docs, but string role examples conflict with numeric enum |
| `backend/src/modules/admin-agent/dto/agent-request.dto.ts` | Adequate | Minimal but useful; `sessionId` should have stronger validation/transform behavior |
| `backend/src/modules/admin-agent/dto/agent-response.dto.ts` | Missing | Fully commented out |
| `backend/src/modules/users/entities/user.entity.ts` | Medium | Field docs exist, but sensitive fields need safer public response boundaries |
| `backend/src/modules/admin-agent/entities/chat-message.entity.ts` | Low | Missing field-level documentation |
| `backend/src/modules/admin-agent/entities/chat-session.entity.ts` | Low | Missing field-level documentation and has garbled default title |
| `backend/src/core/entities/app-setting.entity.ts` | Low but acceptable | Minimal placeholder-like entity |

## Recommendation

I would not treat the current backend documentation as sufficient for an LLM agent that performs real API actions autonomously.

It is sufficient for:

- Understanding the broad backend structure.
- Basic navigation across auth, users, and admin-agent modules.
- Drafting initial clients or tests.

It is not sufficient for:

- Safe autonomous API operation.
- Accurate OpenAPI contract generation.
- Reliable response-model inference.
- Avoiding role-value and register-payload mistakes.
- Understanding chat persistence and side effects.

## Priority Fixes

1. Fix file encoding and rebuild `backend/swagger-spec.json`.
2. Sync `AuthController` docs with `RegisterDto`: `fullName`, password min 8, no `username`.
3. Decide whether `UserRole` is numeric or string at the API boundary, then document and enforce it consistently.
4. Add explicit response DTOs: `UserResponseDto`, `SessionResponseDto`, `ChatMessageResponseDto`, `AuthMeResponseDto`.
5. Restore or delete `AgentResponseDto`; if streaming is the real contract, document the stream format explicitly.
6. Add field-level docs to `ChatSession` and `ChatMessage`.
7. Separate persistence entities from public Swagger response DTOs, especially for `password` and `refreshToken`.
8. Align `UpdateUserDto` and `PATCH /users/:id` documentation around whether role updates are allowed there.

## Bottom Line

The foundation is useful, especially in the main controllers and several DTOs, but the documentation is not yet a reliable source of truth for an LLM agent. Before connecting an agent that can execute real backend actions, the Swagger/DTO/entity documentation should be made consistent, readable, and explicit about response shapes, authorization, side effects, and sensitive fields.
