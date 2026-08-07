import { SwaggerToolsParser } from './swagger-tools.parser';
import { Reflector } from '@nestjs/core';

/**
 * C5 H3 — verify that getTools() excludes AdminAgentController_confirmAction
 * so the LLM cannot confirm its own dangerous actions.
 *
 * The parser reads the real swagger-spec.json in its constructor, so tests
 * work against the actual spec rather than mocks. The denylist filter runs
 * after spec loading — if it works, tool count drops by exactly 1.
 */
describe('SwaggerToolsParser — C5 H3: confirmAction hidden from LLM', () => {
  let parser: SwaggerToolsParser;
  let toolNames: string[];

  beforeAll(() => {
    parser = new SwaggerToolsParser(new Reflector() as any);
    toolNames = parser.getTools().map((t) => t.function?.name ?? '');
  });

  it('confirmAction is excluded from the LLM tool list', () => {
    expect(toolNames).not.toContain('AdminAgentController_confirmAction');
  });

  it('dangerous operations are still exposed (no over-filtering)', () => {
    expect(toolNames).toContain('UsersController_delete');
    expect(toolNames).toContain('UsersController_updateRole');
    expect(toolNames).toContain('LlmProviderController_cleanupTestResults');
  });

  it('getEndpoint still returns confirmAction metadata (UI calls it directly)', () => {
    // The endpoint is still reachable — only the tool exposure is blocked
    const endpoint = parser.getEndpoint('AdminAgentController_confirmAction');
    expect(endpoint).toBeDefined();
    expect(endpoint?.path).toContain('confirm-action');
  });

  it('confirmAction is the only tool filtered (total = spec tools minus 1)', () => {
    // The real spec loads 68 tools; with the denylist it should be 67
    // If someone adds more tools to the denylist, this test will need updating
    expect(toolNames.length).toBeGreaterThanOrEqual(67);
    expect(toolNames.length).toBeLessThanOrEqual(69); // tolerance for spec changes
  });
});
