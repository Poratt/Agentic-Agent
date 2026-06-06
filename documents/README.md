# Agentic Admin - System Overview

This document describes the current application: a full-stack admin system with an Angular frontend, a NestJS backend, and an Admin Agent module that can perform management actions through tool-based chat.

## System Purpose

The application is an internal admin system where users can sign in, manage users, and interact with an admin agent connected to the backend API. The agent does more than return text: it receives a tool list generated from Swagger, selects the right endpoint, executes it through the server, and returns a streamed response with progress updates.

## Stack

| Layer | Technologies |
|---|---|
| Frontend | Angular 21, standalone components, signals, Reactive Forms, PrimeNG, Phosphor Icons |
| Backend | NestJS 11, TypeORM, MySQL, Swagger, JWT, cookies |
| AI Agent | OpenAI-compatible Chat Completions through providers such as `nvidia` or `openrouter` |
| API Docs | Swagger at `/api`, including `summaryHe` for Hebrew semantic action labels |

## Project Structure

```text
frontend/
  src/app/core/       Services, stores, guards, interceptors, models, enums
  src/app/features/   Application screens and feature components
  src/app/assets/     Global CSS and design tokens

backend/
  src/modules/auth/          Login, registration, refresh, logout
  src/modules/users/         User management and permissions
  src/modules/admin-agent/   Admin agent, chat, tools, session history
  src/core/                  Types, guards, filters, config, enums
```

## Frontend

The frontend is built with Angular standalone components only. Screens live under `frontend/src/app/features`, and the main route map is defined in `frontend/src/app/app.routes.ts`.

| Route | Feature | Description |
|---|---|---|
| `/login` | Auth Login | User login |
| `/register` | Auth Register | New user registration |
| `/dashboard` | Dashboard | Authenticated home screen |
| `/users` | Users Management | User list and permission management |
| `/explorer` | Explorer | System explorer screen |
| `/chat` | Chat | Chat with the Admin Agent |
| `/chat/history` | Chat History | Chat session history |
| `/design-system` | Design System | Design-system inspection screen, routed but not shown in the main menu |

The sidebar shows Dashboard, Users, Explorer, and Chat. It also includes a dropdown for recent conversations, session deletion, theme switching, user profile details, and logout.

### Core Stores and Services

| Store / Service | Responsibility |
|---|---|
| `AuthStore` + `AuthService` | Login, register, logout, refresh, session check |
| `UsersStore` + `UserService` | Load users, current user profile, update, delete, role changes |
| `ChatStore` + `ChatService` | Chat sessions, history loading, session creation/deletion, streaming queries |
| `ThemeService` | Dark/light mode through `data-theme` and localStorage |
| `authGuard` | Protects the authenticated application area |
| `authInterceptor` | Handles `401` responses and refresh flow |
| `withCredentialsInterceptor` | Sends cookies with every API request |

### Frontend Conventions

- Every component is standalone.
- Use `inject()`, signals, and `computed`.
- Feature pages use `PageStates`: `Loading = 1`, `Ready`, `Error`, `Empty`.
- Page templates use `@switch (pageState())` for all screen states.
- API services use `environment.apiUrl`.
- Every API change must update both the backend controller and the frontend service/store.
- CSS relies on global style files under `frontend/src/app/assets/styles`.
- Do not use hardcoded CSS values; use `var(--token)` only.

## Backend

The backend is a NestJS application using TypeORM and MySQL. There is no global API prefix; endpoints are exposed directly by controller path. Swagger is available at `/api`, and `swagger-spec.json` is written during bootstrap. The Admin Agent uses that Swagger file to build its tool list.

### Modules

| Module | Responsibility |
|---|---|
| `AuthModule` | Registration, login, refresh token, logout, user identity |
| `UsersModule` | User CRUD and role management |
| `AdminAgentModule` | Agent chat, sessions, LLM access, Swagger tools, tool execution |

### Main Endpoints

| Method | Path | Authorization | Description |
|---|---|---|---|
| `GET` | `/` | Public | Basic health check |
| `POST` | `/auth/register` | Public | Register a user |
| `POST` | `/auth/login` | Public | Login and set auth cookies |
| `POST` | `/auth/refresh` | Refresh cookie | Refresh the access token |
| `POST` | `/auth/logout` | Access cookie | Logout |
| `GET` | `/auth/me` | JWT | User data from the token |
| `GET` | `/users` | JWT | User list |
| `GET` | `/users/me` | JWT | Current user data |
| `GET` | `/users/:id` | JWT | User by id |
| `PATCH` | `/users/:id` | Admin | Update user |
| `DELETE` | `/users/:id` | Admin | Delete user |
| `PATCH` | `/users/:id/role` | Admin | Change user role |
| `GET` | `/admin-agent/sessions` | JWT | Chat session list |
| `POST` | `/admin-agent/sessions` | JWT | Create a new session |
| `GET` | `/admin-agent/sessions/:id/messages` | JWT | Session messages |
| `DELETE` | `/admin-agent/sessions/:id` | JWT | Delete a session |
| `POST` | `/admin-agent/query-stream` | JWT | Streamed conversation with the agent |

### Auth and Permissions

The actual implementation is cookie-based. After login, the server sets `access_token` and `refresh_token` as HTTP-only cookies. The JWT strategies read tokens from cookies, and the frontend sends them through `withCredentials`.

User roles are numeric enum values:

```ts
Admin = 1
User = 2
```

Most business responses are wrapped in `ServiceResultContainer<T>` with `success`, `message`, and `result`. Error responses may also include fields such as `error` and `statusCode`.

## Server-Side Agent Capabilities

`AdminAgentModule` is the system's Function Calling mechanism. It lets a user write a natural-language request, such as "show me the users" or "change user 5 role", and the server translates that request into a real API action.

### Agent Flow

```text
User prompt
  -> Load session and conversation history
  -> Send to the LLM with SYSTEM_CONTEXT and tools
  -> The model selects a tool
  -> Execute an internal endpoint through AgentToolExecutorService
  -> Save the tool result in history
  -> Return to the LLM until a final response is produced
  -> Stream token/step events back to the UI
```

### Agent Components

| Component | Responsibility |
|---|---|
| `AdminAgentService` | Orchestrator: conversation, iterations, tools, streaming, persistence |
| `LlmService` | Model calls, retries, streaming |
| `SwaggerToolsParser` | Reads `swagger-spec.json` and converts endpoints into LLM tools |
| `AgentToolExecutorService` | Runs a tool call as an internal HTTP request to the API |
| `AgentSessionService` | Stores sessions/messages and enforces ownership by `userId` |
| `ChatSession` / `ChatMessage` | Chat history tables |

### Swagger as Tools

The system uses Swagger as the source of truth for agent tools:

- Every `operationId` becomes a function tool name.
- Path, query, and body parameters become the tool schema.
- Swagger `$ref` schemas are dereferenced or cleaned to fit model constraints.
- `additionalProperties: false` is enforced to reduce unexpected arguments.
- `summaryHe` takes priority over `summary` as the Hebrew action description.

Every new endpoint that should be available to the agent must be fully documented in its controller with:

- `@ApiOperation`
- `summary`
- `description`
- `summaryHe`
- `} as CustomApiOperationOptions)`
- `@ApiParam`, `@ApiQuery`, `@ApiBody`, and `@ApiResponse` as needed

### Streaming to the UI

The `POST /admin-agent/query-stream` endpoint returns newline-delimited JSON. The UI displays two event types:

| Type | Meaning |
|---|---|
| `step` | An action the agent is performing, including an icon and display message |
| `token` | Streamed response text from the model |

This lets the user see both the final answer and the actions executed along the way.

### Tool Execution Security

When the agent executes an endpoint, the server creates a short-lived JWT for the current user and performs an internal API request. This keeps the call under the same user context rather than running as an anonymous or unrestricted process.

Explicit protections also exist:

- The agent cannot delete the currently logged-in user.
- The agent cannot demote the currently logged-in admin from Admin to User.
- If the model sends a role as a string, `admin` is converted to `1` and `user` is converted to `2`.
- `SYSTEM_CONTEXT` requires identifier verification before sensitive actions, especially when the user provides both a name and an id.

## Core Environment Variables

The project needs environment variables for the server, database, JWT configuration, and model provider.

```bash
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=agentic_admin

JWT_SECRET=...
JWT_REFRESH_SECRET=...

AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_BASE_URL=...
OPENROUTER_MODEL=...

NVIDIA_API_KEY=...
NVIDIA_BASE_URL=...
NVIDIA_MODEL=...
```

## Working Commands

From the project root:

```bash
# Frontend
npx ng serve frontend
npx ng build
npx ng test frontend --watch=false

# Backend
npm.cmd --prefix backend run build
npm.cmd --prefix backend test
```

When running from inside each app directory:

```bash
cd frontend
npx ng serve
npx ng build

cd backend
npm.cmd run start:dev
npm.cmd run build
npm.cmd test
```

## Important Development Rules

- Before changing code, read the relevant project rules and nearby examples.
- Frontend changes must preserve the `PageStates` and `@switch` pattern.
- Controller changes must preserve complete Swagger documentation, including `summaryHe`.
- Do not change method logic as part of a documentation-only change.
- Do not add hardcoded CSS; use global design tokens only.
- Enums start at `1`.
- Do not run Prettier manually; it runs through hooks.
- Do not copy corrupted Hebrew from files or terminal output. Write fresh text and verify UTF-8.

## Current Notes

- `documents/README.md` is a current system description based on the existing code.
- Some existing code files contain corrupted Hebrew encoding; this document does not copy those strings.
- `ChatService` is not fully consistent with `ServiceResultContainer` across all requests.
- `SwaggerToolsParser` depends on `swagger-spec.json` existing and on the correct working directory when the server starts.
- Every endpoint documented in Swagger may become an agent tool, so authorization, guards, and semantic action descriptions must be considered before adding new endpoints.
