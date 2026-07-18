import { Test, TestingModule } from '@nestjs/testing';
import { McpBridgeService } from './mcp-bridge.service';
import * as configModule from './mcp-bridge.config';

jest.mock('./mcp-server-client', () => {
  return {
    McpServerClient: jest.fn().mockImplementation(() => ({
      id: 'weather',
      connect: jest.fn(),
      getTools: jest.fn().mockReturnValue([
        { name: 'get_forecast', description: 'Get forecast', inputSchema: { type: 'object', properties: {} } },
        { name: 'get_current_conditions', description: 'Get current conditions', inputSchema: { type: 'object', properties: {} } },
      ]),
      callTool: jest.fn().mockResolvedValue('{"temp": 20}'),
      close: jest.fn(),
    })),
  };
});

describe('McpBridgeService', () => {
  let service: McpBridgeService;

  beforeEach(async () => {
    jest.spyOn(configModule, 'readBridgeConfig').mockReturnValue({
      enabled: true,
      connectTimeoutMs: 5000,
      servers: [
        { id: 'weather', package: '@dangahagan/weather-mcp', entry: '/dist/index.js' },
      ],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [McpBridgeService],
    }).compile();

    service = module.get<McpBridgeService>(McpBridgeService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect and register tools when enabled', async () => {
      await service.onModuleInit();
      expect(service.getTools()).toHaveLength(2);
      expect(service.hasTool('get_forecast')).toBe(true);
      expect(service.hasTool('get_current_conditions')).toBe(true);
      expect(service.hasTool('unknown_tool')).toBe(false);
    });

    it('should tag tools with source mcp', async () => {
      await service.onModuleInit();
      const tools = service.getTools();
      for (const tool of tools) {
        expect(tool.source).toBe('mcp');
        expect(tool.type).toBe('function');
      }
    });
  });

  describe('callTool', () => {
    it('should route to the correct server client', async () => {
      await service.onModuleInit();
      const result = await service.callTool('get_forecast', { latitude: 32 });
      expect(result).toBe('{"temp": 20}');
    });

    it('should return error envelope for unknown tool', async () => {
      await service.onModuleInit();
      const result = await service.callTool('nonexistent', {});
      const parsed = JSON.parse(result);
      expect(parsed.error).toBe(true);
      expect(parsed.source).toBe('mcp');
    });
  });

  describe('requiresConfirmation', () => {
    it('should return false by default', async () => {
      await service.onModuleInit();
      expect(service.requiresConfirmation('get_forecast')).toBe(false);
    });
  });

  describe('getToolIcon', () => {
    it('should return undefined when no icon configured', async () => {
      await service.onModuleInit();
      expect(service.getToolIcon('get_forecast')).toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all state', async () => {
      await service.onModuleInit();
      expect(service.getTools()).toHaveLength(2);
      await service.onModuleDestroy();
      expect(service.getTools()).toHaveLength(0);
      expect(service.hasTool('get_forecast')).toBe(false);
    });
  });

  describe('disabled mode', () => {
    it('should not connect when MCP_ENABLED=false', async () => {
      jest.spyOn(configModule, 'readBridgeConfig').mockReturnValue({
        enabled: false,
        connectTimeoutMs: 5000,
        servers: [],
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [McpBridgeService],
      }).compile();

      const disabledService = module.get<McpBridgeService>(McpBridgeService);
      await disabledService.onModuleInit();
      expect(disabledService.getTools()).toHaveLength(0);
      expect(disabledService.hasTool('get_forecast')).toBe(false);
    });
  });
});
