import { Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client';
import type { McpServerLaunchSpec } from './mcp-bridge.config';

// The SDK's exports map doesn't resolve ./client/stdio at runtime in Node 24.
// We resolve via ./client (which works) and navigate to stdio.js in the same directory.
// sdk.d.ts declares the module types for TS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StdioClientTransport = require(
  require('path').join(
    require('path').dirname(require.resolve('@modelcontextprotocol/sdk/client')),
    'stdio.js',
  ),
).StdioClientTransport;

export interface McpServerTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export class McpServerClient {
  private readonly logger = new Logger(McpServerClient.name);
  private client: Client | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transport: any = null;
  private tools: McpServerTool[] = [];
  private failed = false;

  constructor(private readonly launchSpec: McpServerLaunchSpec) {}

  get id(): string {
    return this.launchSpec.id;
  }

  get isConnected(): boolean {
    return this.client !== null && !this.failed;
  }

  async connect(timeoutMs: number): Promise<void> {
    this.transport = new StdioClientTransport({
      command: this.launchSpec.command,
      args: this.launchSpec.args,
      env: this.launchSpec.env,
      stderr: 'pipe',
    });

    this.client = new Client(
      { name: 'agentic-admin', version: '1.0.0' },
      { capabilities: {} },
    );

    const connectPromise = this.client.connect(this.transport);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Connect timeout after ${timeoutMs}ms`)), timeoutMs),
    );

    await Promise.race([connectPromise, timeoutPromise]);

    const result = await this.client.listTools();
    this.tools = result.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));

    this.logger.log(
      `[${this.id}] Connected — ${this.tools.length} tools: [${this.tools.map((t) => t.name).join(', ')}]`,
    );
  }

  getTools(): McpServerTool[] {
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client || this.failed) {
      return JSON.stringify({
        error: true,
        source: 'mcp',
        toolName: name,
        message: `MCP server "${this.id}" is not connected`,
      });
    }

    let res;
    try {
      res = await this.client.callTool({ name, arguments: args });
    } catch (err) {
      this.logger.error(`[${this.id}] callTool("${name}") failed: ${(err as Error).message}`);
      this.failed = true;
      return JSON.stringify({
        error: true,
        source: 'mcp',
        toolName: name,
        message: err instanceof Error ? err.message : 'MCP call failed',
      });
    }

    const text = (res.content ?? [])
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    return text.length > 0 ? text : JSON.stringify({ error: 'Empty MCP tool result' });
  }

  async close(): Promise<void> {
    try {
      await this.transport?.close();
    } catch {
      // transport may already be closed
    }
    this.client = null;
    this.transport = null;
    this.tools = [];
  }
}
