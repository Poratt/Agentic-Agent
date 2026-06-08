# Agentic Admin Architecture Diagram

This document describes the current high-level architecture of the Agentic Admin system.

The system is a full-stack admin application:

- Angular frontend for chat, authentication, layout, and admin screens.
- NestJS backend for REST APIs, authentication, database access, agent orchestration, and LLM access.
- Swagger-generated tool metadata that turns backend endpoints into callable admin-agent tools.
- External providers for LLMs, weather, currency, and local Ollama models.

## System Architecture

```mermaid
flowchart TD
  User[Admin User]

  subgraph Frontend["Angular Frontend"]
    Shell[Main Layout / Sidebar]
    AuthUI[Auth Feature]
    ChatUI[Chat Feature]
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
    WeatherModule[WeatherModule]
    AnalyticsModule[AnalyticsModule]
    CurrencyModule[CurrencyModule]
  end

  subgraph AgentCore["Admin Agent Core"]
    AdminAgentController[AdminAgentController]
    AdminAgentService[AdminAgentService]
    AgentSessionService[AgentSessionService]
    AgentToolExecutor[AgentToolExecutorService]
    SwaggerParser[SwaggerToolsParser]
    SystemContext[SYSTEM_CONTEXT]
    GenUiSpec[GenUiSpec Constants]
  end

  subgraph LlmCore["LLM Core"]
    LlmController[LlmController]
    LlmService[LlmService]
    ModelCatalog[LLM Model Catalog]
  end

  subgraph Data["Database"]
    UsersTable[(users)]
    ChatSessionsTable[(chat_sessions)]
    ChatMessagesTable[(chat_messages)]
  end

  subgraph External["External Providers"]
    OpenRouter[OpenRouter API]
    Nvidia[NVIDIA API]
    Ollama[Local Ollama]
    WeatherApi[Weather API]
    CurrencyApi[Currency API]
  end

  User --> Shell
  Shell --> AuthUI & ChatUI
  ChatUI --> ChatMessage & FrontendServices
  ChatMessage --> AiFormat
  AuthUI --> FrontendServices
  FrontendServices --> AuthModule & UsersModule & AdminAgentController & LlmController

  AppModule --> AuthModule & UsersModule & AdminAgentModule & LlmModule & SystemModule & WeatherModule & AnalyticsModule & CurrencyModule

  AdminAgentModule --> AdminAgentController
  AdminAgentController --> AdminAgentService
  AdminAgentService --> AgentSessionService & AgentToolExecutor & SwaggerParser & SystemContext & LlmService
  AgentToolExecutor --> SwaggerParser & AuthModule & UsersModule & SystemModule & WeatherModule & AnalyticsModule & CurrencyModule
  SwaggerParser --> SwaggerSpec[swagger-spec.json]
  SwaggerSpec --> GenUiSpec

  LlmModule --> LlmController
  LlmController --> LlmService
  LlmService --> ModelCatalog & OpenRouter & Nvidia & Ollama

  AuthModule & UsersModule --> UsersTable
  AgentSessionService --> ChatSessionsTable & ChatMessagesTable
  AnalyticsModule --> UsersTable & ChatSessionsTable & ChatMessagesTable

  WeatherModule --> WeatherApi
  CurrencyModule --> CurrencyApi
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
  participant LLM as LlmService
  participant Tools as AgentToolExecutorService
  participant BackendTool as Backend Tool
  participant DB as Database

  Admin->>Chat: Send prompt
  Chat->>API: POST /admin-agent/query-stream
  API->>Agent: queryDatabaseStream(...)
  Agent->>Sessions: Save user message
  Agent->>Parser: Load Swagger tools
  Agent->>Sessions: Load session history
  Agent->>LLM: generateResponse(...)

  alt Tool Calls
    LLM-->>Agent: toolCalls[]
    Agent->>Sessions: Save tool-call message
    Agent->>Agent: Group safe GET tools

    par Safe tools (parallel)
      Agent->>Tools: executeToolCall()
      Tools->>BackendTool: Internal request
      BackendTool->>DB: Query
      DB-->>Tools: Result
      Tools-->>Agent: JSON result
    end

    Agent->>Sessions: Save tool results
    Agent->>LLM: generateResponse(with results)
  else Final Response
    LLM-->>Agent: Assistant content
    Agent-->>API: Stream tokens
    API-->>Chat: SSE
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
    LLM["LlmModule"]
    System["SystemModule"]
    Weather["WeatherModule"]
    Analytics["AnalyticsModule"]
    Currency["CurrencyModule"]
  end

  Auth & Users --> UsersDb[(users)]
  AdminAgent --> ChatDb[(chat_sessions\nchat_messages)]
  Analytics --> UsersDb & ChatDb
  System --> UsersDb & ChatDb
  Weather --> WeatherApi[Weather API]
  Currency --> CurrencyApi[Currency API]
  LLM --> Providers[LLM Providers]

```

## GenUI Rendering Path

````mermaid
flowchart TD
  ToolEndpoint[Backend Endpoint\nwith genUiSpec] --> SwaggerSpec[swagger-spec.json]
  SwaggerSpec --> Parser[SwaggerToolsParser]
  Parser --> ToolDesc[Tool Description\n+ GenUI Instruction]
  ToolDesc --> LLM[LlmService]
  LLM --> Component[```component]
  Component --> Stream[SSE Stream]
  Stream --> AiFormat[AiFormat Directive]
  AiFormat --> Skeleton[Skeleton Loader]
  AiFormat --> Render[Sanitized GenUI Component]
````

## Model Selection Path

```mermaid
sequenceDiagram
  autonumber
  participant Chat as Angular Chat UI
  participant LlmApi as LlmController
  participant Llm as LlmService
  participant Catalog as Model Catalog
  participant Ollama as Local Ollama
  participant Agent as AdminAgentService

  Chat->>LlmApi: GET /llm/model-options
  LlmApi->>Llm: getModelOptions()
  Llm->>Catalog: Static models
  Llm->>Ollama: Local models
  Llm-->>Chat: Grouped options
  Chat->>Agent: Query with provider/model
  Agent->>Llm: generateResponse(override)
```

## Current Architecture Notes

- The backend is the **source of truth** for available LLM models.
- Swagger metadata is the tool catalog for the admin agent.
- `genUiSpec` is defined in shared constants and attached via Swagger decorators.
- The agent currently runs in a **single active flow** (no independent sub-agents yet).
- Read-only tools run in parallel, mutations run sequentially.
- Full conversation history (user + assistant + tool messages) is persisted in the backend.
