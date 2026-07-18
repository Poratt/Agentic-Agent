# Agentic Admin Architecture Diagram

This document describes the current high-level architecture of the Agentic Admin system.

The system is a full-stack admin application:

- Angular frontend for chat, authentication, layout, and admin screens.
- NestJS backend for REST APIs, authentication, database access, agent orchestration, and LLM access.
- Swagger-generated tool metadata that turns backend endpoints into callable admin-agent tools.
- MCP Bridge for external tool servers (weather-mcp, etc.).
- External providers for LLMs, currency, and local Ollama models.

## System Architecture

```mermaid
flowchart TD
  User[Admin User]

  subgraph Frontend["Angular Frontend"]
    Shell[Main Layout / Sidebar]
    AuthUI[Auth Feature]
    ChatUI[Chat Feature]
    StrainHunterUI[StrainHunter Feature]
    SharedTooltip[Shared Tooltip Component]
    ChatMessage[Chat Message Renderer]
    AiFormat[AiFormat Directive]
    FrontendServices[Core HTTP Services]
    FrontendStores[Signal Stores]
  end

  subgraph Backend["NestJS Backend"]
    AppModule[AppModule]
    AuthModule[AuthModule]
    UsersModule[UsersModule]
    AdminAgentModule[AdminAgentModule]
    LlmModule[LlmModule]
    SystemModule[SystemModule]
    McpBridgeModule[McpBridgeModule]
    AnalyticsModule[AnalyticsModule]
    CurrencyModule[CurrencyModule]
    StrainHunterModule[StrainHunterModule]
    TerpeneModule[TerpeneModule]
    GeneticsModule[GeneticsModule]
  end

  subgraph AgentCore["Admin Agent Core"]
    AdminAgentController[AdminAgentController]
    AdminAgentService[AdminAgentService]
    AgentSessionService[AgentSessionService]
    AgentToolExecutor[AgentToolExecutorService]
    SwaggerParser[SwaggerToolsParser]
    McpBridge[McpBridgeService]
    SystemContext[SYSTEM_CONTEXT]
    GenUiSpec[GenUiSpec Constants]
  end

  subgraph LlmCore["LLM Core"]
    LlmController[LlmController]
    LlmService[LlmService Facade]
    ProviderConfig[LlmProviderConfigService]
    ClientService[LlmClientService]
    ModelCatalog[LlmModelCatalogService]
    HealthService[LlmHealthService]
  end

  subgraph Data["Database"]
    UsersTable[(users)]
    ChatSessionsTable[(chat_sessions)]
    ChatMessagesTable[(chat_messages)]
    TerpenesTable[(terpenes)]
    GeneticsTable[(genetics)]
  end

  subgraph External["External Providers"]
    OpenRouter[OpenRouter API]
    Nvidia[NVIDIA API]
    Ollama[Local Ollama]
    WeatherMcp[Weather MCP Server]
    CurrencyApi[Currency API]
    JaneApi[Jane API / Store Page]
  end

  User --> Shell
  Shell --> AuthUI & ChatUI & StrainHunterUI
  ChatUI --> ChatMessage & FrontendServices
  StrainHunterUI --> SharedTooltip & FrontendServices
  StrainHunterUI --> StrainHunterModule
  ChatMessage --> AiFormat
  AuthUI --> FrontendServices
  FrontendServices --> AuthModule & UsersModule & AdminAgentController & LlmController & TerpeneModule & GeneticsModule

  AppModule --> AuthModule & UsersModule & AdminAgentModule & LlmModule & SystemModule & McpBridgeModule & AnalyticsModule & CurrencyModule & StrainHunterModule & TerpeneModule & GeneticsModule

  AdminAgentModule --> AdminAgentController
  AdminAgentController --> AdminAgentService
  AdminAgentService --> AgentSessionService & AgentToolExecutor & SwaggerParser & McpBridge & SystemContext & LlmService
  AgentToolExecutor --> SwaggerParser & McpBridge & AuthModule & UsersModule & SystemModule & AnalyticsModule & CurrencyModule & StrainHunterModule & TerpeneModule & GeneticsModule
  SwaggerParser --> SwaggerSpec[swagger-spec.json]
  SwaggerSpec --> GenUiSpec

  LlmModule --> LlmController
  LlmController --> LlmService
  LlmService --> ProviderConfig & ClientService & ModelCatalog & HealthService
  ClientService --> ProviderConfig
  ClientService --> OpenRouter & Nvidia & Ollama
  ModelCatalog --> ProviderConfig & Ollama
  HealthService --> ClientService & ProviderConfig & ModelCatalog

  AuthModule & UsersModule --> UsersTable
  AgentSessionService --> ChatSessionsTable & ChatMessagesTable
  AnalyticsModule --> UsersTable & ChatSessionsTable & ChatMessagesTable

  McpBridge --> WeatherMcp
  CurrencyModule --> CurrencyApi
  StrainHunterModule --> JaneApi
```

## Chat And Tool Execution Flow

```mermaid
sequenceDiagram
  autonumber
  actor Admin as Admin User
  participant Chat as Angular Chat UI
  participant API as AdminAgentController
  participant Agent as AdminAgentService
  participant Sessions as AgentSessionService
  participant Parser as SwaggerToolsParser
  participant LLM as LlmService Facade
  participant Client as LlmClientService
  participant Tools as AgentToolExecutorService
  participant McpBridge as McpBridgeService
  participant McpServer as Weather MCP Server
  participant BackendTool as Backend Tool
  participant DB as Database

  Admin->>Chat: Send prompt
  Chat->>API: POST /admin-agent/query-stream
  opt User stops active response
    Chat-->>API: Abort stream request
    API-->>Agent: Stop writing response
  end
  API->>Agent: queryDatabaseStream(...)
  Agent->>Sessions: Save user message
  Agent->>Parser: Load Swagger tools
  Agent->>Sessions: Load session history
  Agent->>LLM: generateResponse(...)
  LLM->>Client: generateResponse(...)

  alt Tool Calls
    Client-->>LLM: toolCalls[]
    LLM-->>Agent: toolCalls[]
    Agent->>Sessions: Save tool-call message
    Agent->>Agent: Group safe GET tools

    par Safe tools (parallel)
      alt MCP tool (dispatch branch)
        Agent->>Tools: executeToolCall()
        Tools->>McpBridge: callTool()
        McpBridge->>McpServer: stdin JSON-RPC
        McpServer-->>McpBridge: stdout result
        McpBridge-->>Tools: markdown text
        Tools-->>Agent: result
      else Swagger tool
        Agent->>Tools: executeToolCall()
        Tools->>BackendTool: Internal request
        BackendTool->>DB: Query
        DB-->>Tools: Result
        Tools-->>Agent: JSON result
      end
    end

    Agent->>Sessions: Save tool results
    Agent->>LLM: generateResponse(with results)
    LLM->>Client: generateResponse(with results)
  else Final Response
    Client-->>LLM: Assistant content
    LLM-->>Agent: Assistant content
    Agent-->>API: Stream tokens
    API-->>Chat: SSE
  end
```

## Chat Message Actions Flow

```mermaid
sequenceDiagram
  autonumber
  actor Admin as Admin User
  participant Chat as Angular Chat UI
  participant Msg as ChatMessage Component
  participant Service as ChatService
  participant API as AdminAgentController
  participant Agent as AdminAgentService
  participant Sessions as AgentSessionService
  participant DB as Database

  Admin->>Msg: Click message action
  Msg-->>Chat: actionRequested(action, message)

  alt Delete message
    Chat->>Service: deleteMessage(sessionId, messageId)
    Service->>API: DELETE /admin-agent/sessions/:sessionId/messages/:messageId
    API->>Agent: deleteSessionMessage(...)
    Agent->>Sessions: Verify ownership and message membership
    Sessions->>DB: Delete selected message and later messages
    DB-->>Chat: 204 No Content
    Chat->>Chat: Remove selected and later messages locally
  else Copy / edit / send again
    Chat->>Chat: Copy content, patch prompt, or resend resolved prompt
  end
```

## Tool Safety And Parallel Execution

```mermaid
flowchart LR
  ToolCalls[LLM Tool Calls] --> Classifier{Is tool\nparallel safe?}

  Classifier -->|GET + safe| SafeGroup[Read-only batch]
  Classifier -->|Mutation / Blocked| UnsafeSingle[Single sequential]

  SafeGroup --> Parallel[Promise.all]
  UnsafeSingle --> Sequential[Await sequentially]

  Parallel & Sequential --> PreserveOrder[Preserve order]
  PreserveOrder --> Save[Save to history]
  Save --> Next[Next LLM turn]
```

## Backend Module Responsibilities

```mermaid
flowchart TB
  subgraph Modules["Backend Modules"]
    Auth["AuthModule"]
    Users["UsersModule"]
    AdminAgent["AdminAgentModule"]
    LLM["LlmModule\nfacade, config, client, model catalog, health checks"]
    System["SystemModule"]
    McpBridge["McpBridgeModule\nMCP tool server integration\n(stdio transport, child process)"]
    Analytics["AnalyticsModule"]
    Currency["CurrencyModule"]
    StrainHunter["StrainHunterModule\nJane API fetch and normalized items"]
    Terpene["TerpeneModule\nterpene catalog with effects, role lookup"]
    Genetics["GeneticsModule\nstrain lineage catalog with parent1/parent2/origin, role lookup"]
  end

  Auth & Users --> UsersDb[(users)]
  AdminAgent --> ChatDb[(chat_sessions\nchat_messages)]
  Analytics --> UsersDb & ChatDb
  System --> UsersDb & ChatDb
  McpBridge --> WeatherMcp[Weather MCP Server]
  Currency --> CurrencyApi[Currency API]
  StrainHunter --> JaneApi[Jane API / Store Page]
  Terpene --> TerpenesDb[(terpenes)]
  Genetics --> GeneticsDb[(genetics)]
  LLM --> Providers[LLM Providers]
```

## GenUI Rendering Path

````mermaid
flowchart TD
  ToolEndpoint[Backend Endpoint\nwith genUiSpec] --> SwaggerSpec[swagger-spec.json]
  SwaggerSpec --> Parser[SwaggerToolsParser]
  Parser --> ToolDesc[Tool Description\n+ GenUI Instruction]
  ToolDesc --> LLM[LlmService Facade]
  LLM --> Client[LlmClientService]
  Client --> Component[```component]
  Component --> Stream[SSE Stream]
  Stream --> AiFormat[AiFormat Directive]
  AiFormat --> ProgressivePreview[Progressive Preview\nrAF-throttled]
  AiFormat --> Skeleton[Skeleton Loader]
  AiFormat --> FinalRender[Sanitized GenUI Component]
````

## Streaming Event Flow

```mermaid
sequenceDiagram
  autonumber
  participant Chat as Angular Chat UI
  participant Service as ChatService
  participant API as AdminAgentController
  participant Agent as AdminAgentService
  participant LLM as LlmClientService
  participant Msg as ChatMessage
  participant Format as AiFormat

  Chat->>Service: sendMessageStream()
  Service->>API: POST /query-stream
  API->>Agent: queryDatabaseStream()

  loop Tool execution steps
    Agent-->>API: {"type":"step","icon":"...","message":"..."}
    API-->>Service: JSON line
    Service-->>Chat: observer.next({step})
    Chat->>Chat: messages.update(steps)
  end

  loop LLM streaming tokens
    Agent-->>API: {"type":"token","content":"..."}
    API-->>Service: JSON line
    Service-->>Chat: observer.next({token})
    Chat->>Chat: pendingTokenBuffer.push() + scheduleTokenFlush()
    Note over Chat: rAF-coalesced flush
    Chat->>Msg: messages.update(content)
    Msg->>Msg: syncContent effect
    alt Prose mode
      Msg->>Msg: per-character queue (18-35ms)
    else Component mode
      Msg->>Msg: fast flush (0ms)
    end
    Msg->>Format: aiFormat input changes
    alt Open component fence
      Format->>Format: extractProgressiveComponentParts()
      Format->>Format: sanitizeProgressiveComponentHtml()
      Format->>Format: scheduleProgressivePreview() [rAF]
    else Closed component fence
      Format->>Format: renderComponentResponse()
    else Markdown only
      Format->>Format: parse() + updateDomEfficiently()
    end
  end

  Agent-->>API: Stream ends
  API-->>Service: done
  Service-->>Chat: observer.complete()
  Chat->>Chat: flushPendingTokens() + loading.set(false)
```

See [genui-streaming-protocol.md](architecture/genui-streaming-protocol.md) for the full protocol reference.

## Model Selection Path

```mermaid
sequenceDiagram
  autonumber
  participant Chat as Angular Chat UI
  participant LlmApi as LlmController
  participant Llm as LlmService Facade
  participant Catalog as LlmModelCatalogService
  participant Config as LlmProviderConfigService
  participant Client as LlmClientService
  participant Ollama as Local Ollama
  participant Agent as AdminAgentService

  Chat->>LlmApi: GET /llm/model-options
  LlmApi->>Llm: getModelOptions()
  Llm->>Catalog: getModelOptions()
  Catalog->>Ollama: Read local models
  Catalog-->>Chat: Grouped options
  Chat->>Agent: Query with provider/model
  Agent->>Llm: generateResponse(override)
  Llm->>Client: generateResponse(override)
  Client->>Config: Resolve provider config
```

## Current Architecture Notes

- The backend is the source of truth for available LLM models.
- Swagger metadata is the tool catalog for the admin agent.
- MCP Bridge integrates external tool servers (weather-mcp, etc.) via stdio transport as child processes. MCP tools are merged into the agent's tool list alongside Swagger tools.
- `genUiSpec` is defined in shared constants and attached via Swagger decorators.
- The agent currently runs in a single active flow.
- Read-only tools run in parallel, mutations run sequentially.
- Full conversation history is persisted in the backend.
- Chat message deletion is persistent and deletes the selected message plus later session history to preserve context consistency.
- Active chat streams can be cancelled from the Angular UI by unsubscribing from the stream request, which aborts the underlying fetch.
- The streaming protocol uses newline-delimited JSON with `step`, `token`, and `done` events. See [genui-streaming-protocol.md](architecture/genui-streaming-protocol.md).
- Token updates are rAF-coalesced in the Chat component to reduce signal writes per frame.
- GenUI component streams flush faster (0ms delay, 12-24 char chunks) than prose streams (18-35ms delay, 1-3 char chunks).
- `AiFormat` renders progressive GenUI previews during streaming using a stable preview host element, replacing the skeleton once partial HTML is safely renderable.
- The backend logs `[AdminAgentStream]` with time-to-first-token, total duration, token count, and component count for each stream.
- The system context is split into `SYSTEM_CONTEXT_BASE` (tool rules, security, anti-hallucination) and `SYSTEM_CONTEXT_GENUI` (visual standard, design system). GenUI rules are only included when the prompt contains visual-trigger keywords.
