# Agentic Admin

A full-stack admin platform whose centerpiece is an AI agent that can operate the application itself. The agent's tools are auto-generated from the backend's Swagger spec, so every REST endpoint becomes a callable tool — the agent plans multi-step tasks, asks for confirmation before destructive actions, and renders results as native UI components inside the chat. Built as a monorepo with an Angular 22 frontend, a NestJS 11 backend, and MySQL, with multi-provider LLM support and a Hebrew/RTL interface.

## Key Features

- **AI admin agent** — streaming chat where the LLM calls the app's own API as tools (Swagger-derived), with NDJSON/SSE streaming, per-iteration tool batching, loop detection, dangerous-action confirmation flow, and an audit log of confirmed/cancelled actions.
- **GenUI rendering** — the backend sends typed "render specs" that the chat renders as ~19 native components (user tables, analytics charts, weather cards, generated images/videos, confirm dialogs, and more) instead of raw text.
- **Multi-provider LLM gateway** — text, image, and video generation across configurable providers (OpenRouter, NVIDIA NIM, local Ollama, Agnes AI, plus any OpenAI-compatible endpoint) managed from the DB, with per-model latency/health testing, retention cleanup, and per-user default models.
- **AI media studio** — image generation with size/ratio presets and image-to-image input, plus async video generation with status polling and a "continue from last frame" feature built on ffmpeg frame extraction.
- **AI business-idea generator** — three-phase pipeline (market signals → idea generation → competitor validation) grounded in live web search, with per-idea scoring (competition, signal fit, feasibility, market size), SSE progress, and cost-aware throttling.
- **Product catalog scraper** — a Puppeteer scraper for an Israeli medical-cannabis store that captures the site's API responses, normalizes ~40 fields per product, and auto-enriches strain genetics and terpenes from lab-data APIs (Cannlytics, BudProfiles), web search, and LLM summarization.
- **Matching engine** — client-side preference scoring (terpene/genetics likes, avoids, adjustable weights) persisted to localStorage and applied to the scraped catalog.
- **Reference catalog management** — CRUD + AI enrichment workflows for genetics and terpenes with editable previews, bulk "enrich missing" runs, and derived theme colors.
- **Admin & platform** — JWT cookie auth with refresh rotation, user/role management, database storage monitor (SVG donut + per-table sizes), catalog-driven analytics, live currency conversion, and a self-hosted SearXNG search wrapper.
- **MCP bridge** — spawns external Model Context Protocol servers (e.g. weather-mcp) as child processes and exposes their tools to the agent.

## Tech Stack

| Layer        | Technology                                                                                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend     | Angular 22 (standalone, signals, `httpResource`), PrimeNG, Phosphor icons, Vitest                                                                                                                                                  |
| Backend      | NestJS 11, TypeORM, MySQL 2, @nestjs/schedule (cron), @nestjs/throttler                                                                                                                                                            |
| Auth         | Passport JWT — HTTP-only `access_token` (15m) + `refresh_token` (7d) cookies, bcrypt, hash-compared refresh rotation                                                                                                               |
| API docs     | Swagger (`/api`), auto-written `swagger-spec.json` that feeds the agent's tool list                                                                                                                                                |
| LLM          | OpenAI SDK pointed at arbitrary base URLs (OpenRouter, NVIDIA NIM, Ollama, Agnes AI)                                                                                                                                               |
| Integrations | Puppeteer (web scraping), SearXNG (self-hosted web search), MCP SDK + `@dangahagan/weather-mcp`, Cannlytics & BudProfiles APIs, open.er-api.com (currency), `ffmpeg-static` (video frame extraction), zod (render-spec validation) |

## Architecture

Monorepo with three top-level packages:

- **`backend/`** — NestJS modules mirroring feature domains: `auth`, `users`, `admin-agent` (agent orchestration, tool execution, audit), `llm` + `llm-provider` (LLM gateway + DB-backed provider config), `ideas`, `strain-hunter`, `terpene`, `genetics`, `web-search`, `currency`, `analytics`, `database-monitor`, `system`, and `mcp-bridge`. Shared core (`guards`, `strategies`, `errors`, `seeds`) under `backend/src/core`.
- **`frontend/`** — Angular app with `features/` (pages), `components/shared` (reusable UI), `core/stores` (signal stores), and `core/services` (API clients). State is plain signal stores backed by `httpResource` for reads.
- **`documents/`** — feature plans, architecture notes, and the system's design-system documentation.

The agent loop: LLM → OpenAI-style tool calls → `AgentToolExecutorService` maps them to the app's own endpoints (calling itself via signed short-lived JWTs) → results validated into GenUI render specs → rendered as native components in chat. External MCP servers are injected as additional tools when enabled.

## Getting Started

Prerequisites: Node.js 22+, MySQL running locally.

Backend (defaults: MySQL `localhost:3306`, database from `DB_NAME` in `.env`, port 3000):

```bash
cd backend
npm install
npm run start:dev
```

Frontend (dev server on `http://localhost:4200`):

```bash
cd frontend
npm install
npm run start
```

On first boot the backend seeds a default admin user (see `backend/src/core/seeds` to configure credentials) and the default LLM providers (OpenRouter, NVIDIA NIM, Agnes AI). Swagger docs are served at `http://localhost:3000/api`.

Configuration lives in `backend/.env`: DB credentials, JWT secrets, provider API keys, `SEARXNG_URL` (default `http://localhost:8080`) for web-search-backed features, and `MCP_ENABLED` for the MCP bridge.
