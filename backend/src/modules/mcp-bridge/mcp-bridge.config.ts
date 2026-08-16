import { Logger } from '@nestjs/common';

export interface McpServerDef {
  id: string;
  package: string;
  entry: string;
  enabled?: boolean;
  enabledTools?: string[];
  requiresConfirmation?: boolean;
  toolIcons?: Record<string, string>;
}

const MCP_SERVERS: McpServerDef[] = [
  {
    id: 'weather',
    package: '@dangahagan/weather-mcp',
    entry: '/dist/index.js',
    enabledTools: ['get_forecast', 'get_current_conditions', 'get_weather_summary', 'check_service_status'],
  },
];

export interface McpBridgeConfig {
  enabled: boolean;
  connectTimeoutMs: number;
  servers: McpServerDef[];
}

export interface McpServerLaunchSpec {
  id: string;
  command: 'node';
  args: string[];
  env?: Record<string, string>;
}

const logger = new Logger('McpBridgeConfig');

export function resolveLaunchSpec(server: McpServerDef): McpServerLaunchSpec | null {
  if (server.enabled === false) {
    return null;
  }
  try {
    const absoluteEntryPath = require.resolve(`${server.package}${server.entry}`);
    return { id: server.id, command: 'node', args: [absoluteEntryPath] };
  } catch (err) {
    logger.warn(
      `[McpBridge] Cannot resolve package "${server.package}" entry "${server.entry}": ${(err as Error).message}. Skipping server "${server.id}".`,
    );
    return null;
  }
}

export function readBridgeConfig(): McpBridgeConfig {
  const enabled = (process.env.MCP_ENABLED ?? 'false') === 'true';
  const connectTimeoutMs = parseInt(process.env.MCP_CONNECT_TIMEOUT_MS ?? '10000', 10);

  const servers: McpServerDef[] = enabled ? MCP_SERVERS : [];

  return { enabled, connectTimeoutMs, servers };
}
