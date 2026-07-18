import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { readBridgeConfig, resolveLaunchSpec, type McpServerDef } from './mcp-bridge.config';
import { McpServerClient, type McpServerTool } from './mcp-server-client';

export interface LlmToolSchema {
  type: 'function';
  source?: 'swagger' | 'mcp';
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

@Injectable()
export class McpBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpBridgeService.name);
  private clients = new Map<string, McpServerClient>();
  private toolToServer = new Map<string, string>();
  private toolIcons = new Map<string, string>();
  private confirmationFlags = new Map<string, boolean>();
  private cachedTools: LlmToolSchema[] = [];

  async onModuleInit(): Promise<void> {
    const config = readBridgeConfig();
    if (!config.enabled) {
      this.logger.log('[McpBridge] Disabled (MCP_ENABLED=false)');
      return;
    }

    for (const server of config.servers) {
      const spec = resolveLaunchSpec(server);
      if (!spec) continue;

      const client = new McpServerClient(spec);
      try {
        await client.connect(config.connectTimeoutMs);
        this.clients.set(server.id, client);

        for (const tool of client.getTools()) {
          this.toolToServer.set(tool.name, server.id);

          if (server.enabledTools && !server.enabledTools.includes(tool.name)) {
            continue;
          }

          if (server.toolIcons?.[tool.name]) {
            this.toolIcons.set(tool.name, server.toolIcons[tool.name]);
          }

          this.confirmationFlags.set(tool.name, server.requiresConfirmation ?? false);

          this.cachedTools.push({
            type: 'function',
            source: 'mcp',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema as Record<string, any>,
            },
          });
        }
      } catch (err) {
        this.logger.warn(
          `[McpBridge] Failed to connect to "${server.id}": ${(err as Error).message}. Skipping.`,
        );
        await client.close();
      }
    }

    if (this.cachedTools.length > 0) {
      this.logger.log(
        `[McpBridge] ${this.cachedTools.length} MCP tool(s) registered: [${this.cachedTools.map((t) => t.function?.name).join(', ')}]`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [id, client] of this.clients) {
      try {
        await client.close();
        this.logger.log(`[McpBridge] Closed "${id}"`);
      } catch (err) {
        this.logger.warn(`[McpBridge] Error closing "${id}": ${(err as Error).message}`);
      }
    }
    this.clients.clear();
    this.toolToServer.clear();
    this.toolIcons.clear();
    this.confirmationFlags.clear();
    this.cachedTools = [];
  }

  getTools(): LlmToolSchema[] {
    return this.cachedTools;
  }

  hasTool(name: string): boolean {
    return this.toolToServer.has(name);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const serverId = this.toolToServer.get(name);
    if (!serverId) {
      return JSON.stringify({ error: true, source: 'mcp', toolName: name, message: 'Unknown MCP tool' });
    }

    const client = this.clients.get(serverId);
    if (!client) {
      return JSON.stringify({ error: true, source: 'mcp', toolName: name, message: `MCP server "${serverId}" not connected` });
    }

    return client.callTool(name, args);
  }

  getToolIcon(name: string): string | undefined {
    return this.toolIcons.get(name);
  }

  requiresConfirmation(name: string): boolean {
    return this.confirmationFlags.get(name) ?? false;
  }
}
