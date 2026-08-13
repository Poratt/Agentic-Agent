import { parseLlmJson } from './llm-json-parser';

describe('parseLlmJson', () => {
  it('returns parsed JSON from plain string', () => {
    const result = parseLlmJson('{"key":"value"}', 'test');
    expect(result).toEqual({ key: 'value' });
  });

  it('strips markdown code fences with json label', () => {
    const input = '```json\n{"key":"value"}\n```';
    const result = parseLlmJson(input, 'test');
    expect(result).toEqual({ key: 'value' });
  });

  it('strips markdown code fences without label', () => {
    const input = '```\n{"key":"value"}\n```';
    const result = parseLlmJson(input, 'test');
    expect(result).toEqual({ key: 'value' });
  });

  it('returns null on invalid JSON', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const result = parseLlmJson('not json at all', 'test');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns null on null input', () => {
    const result = parseLlmJson(null, 'test');
    expect(result).toBeNull();
  });

  it('returns null on empty string', () => {
    const result = parseLlmJson('', 'test');
    expect(result).toBeNull();
  });

  it('returns null on whitespace-only after fence stripping', () => {
    const input = '```\n\n```';
    const result = parseLlmJson(input, 'test');
    expect(result).toBeNull();
  });

  it('handles nested objects', () => {
    const input = '{"outer":{"inner":"value"},"arr":[1,2,3]}';
    const result = parseLlmJson(input, 'test');
    expect(result).toEqual({ outer: { inner: 'value' }, arr: [1, 2, 3] });
  });

  it('handles arrays at root level', () => {
    const input = '[{"id":1},{"id":2}]';
    const result = parseLlmJson(input, 'test');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('trims whitespace around valid JSON', () => {
    const input = '  {"key":"value"}  ';
    const result = parseLlmJson(input, 'test');
    expect(result).toEqual({ key: 'value' });
  });

  it('strips fences with leading/trailing whitespace', () => {
    const input = '  ```json\n  {"key":"value"}  \n```  ';
    const result = parseLlmJson(input, 'test');
    expect(result).toEqual({ key: 'value' });
  });
});
