declare module '@modelcontextprotocol/sdk/dist/cjs/client/index.js' {
  export { Client } from '@modelcontextprotocol/sdk/client';
}

declare module '@modelcontextprotocol/sdk/dist/cjs/client/stdio.js' {
  export { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
}

declare module '@modelcontextprotocol/sdk/client' {
  import { Transport } from '@modelcontextprotocol/sdk/shared/transport';
  import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol';

  export interface Implementation {
    name: string;
    version: string;
  }

  export interface ClientOptions {
    capabilities?: Record<string, unknown>;
  }

  export class Client {
    constructor(clientInfo: Implementation, options?: ClientOptions);
    connect(transport: Transport, options?: RequestOptions): Promise<void>;
    listTools(params?: Record<string, unknown>, options?: RequestOptions): Promise<{
      tools: Array<{
        name: string;
        description?: string;
        inputSchema: Record<string, unknown>;
      }>;
    }>;
    callTool(params: { name: string; arguments?: Record<string, unknown> }, options?: RequestOptions): Promise<{
      content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    }>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/client/stdio' {
  export interface StdioServerParameters {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    stderr?: 'pipe' | 'inherit' | 'ignore' | NodeJS.WritableStream | number;
    cwd?: string;
  }

  export class StdioClientTransport {
    constructor(server: StdioServerParameters);
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: unknown): Promise<void>;
    get stderr(): NodeJS.ReadableStream | null;
    get pid(): number | null;
  }
}
