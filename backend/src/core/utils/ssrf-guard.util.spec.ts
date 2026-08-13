import { assertSafeUrl, SsrfError } from './ssrf-guard.util';

jest.mock('dns', () => {
  const mockLookup = jest.fn();
  return { lookup: mockLookup };
});

const dns = jest.requireMock('dns') as { lookup: jest.Mock };

describe('assertSafeUrl', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('should throw SsrfError for invalid URL', async () => {
    await expect(assertSafeUrl('not-a-url')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('not-a-url')).rejects.toThrow('Invalid URL');
  });

  it('should throw SsrfError for non-HTTPS protocol', async () => {
    await expect(assertSafeUrl('http://example.com')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('http://example.com')).rejects.toThrow("protocol 'http' is not allowed");
  });

  it('should throw SsrfError for blocked hostname 169.254.169.254', async () => {
    await expect(assertSafeUrl('https://169.254.169.254/latest/meta-data')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('https://169.254.169.254/latest/meta-data')).rejects.toThrow(
      "hostname '169.254.169.254' is not allowed",
    );
  });

  it('should throw SsrfError for blocked hostname metadata.google.internal', async () => {
    await expect(assertSafeUrl('https://metadata.google.internal')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('https://metadata.google.internal')).rejects.toThrow(
      "hostname 'metadata.google.internal' is not allowed",
    );
  });

  it('should throw SsrfError when DNS resolution fails', async () => {
    dns.lookup.mockImplementation((_host: string, cb: Function) => {
      cb(new Error('ENOTFOUND'), null);
    });

    await expect(assertSafeUrl('https://nonexistent.invalid')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('https://nonexistent.invalid')).rejects.toThrow('DNS resolution failed');
  });

  it('should throw SsrfError when hostname resolves to private IP 192.168.x.x', async () => {
    dns.lookup.mockImplementation((_host: string, cb: Function) => {
      cb(null, '192.168.1.100');
    });

    await expect(assertSafeUrl('https://internal.example.com')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('https://internal.example.com')).rejects.toThrow('private');
  });

  it('should throw SsrfError when hostname resolves to private IP 10.x.x.x', async () => {
    dns.lookup.mockImplementation((_host: string, cb: Function) => {
      cb(null, '10.0.0.1');
    });

    await expect(assertSafeUrl('https://internal.example.com')).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl('https://internal.example.com')).rejects.toThrow('private');
  });

  it('should resolve successfully for valid public HTTPS URL', async () => {
    dns.lookup.mockImplementation((_host: string, cb: Function) => {
      cb(null, '93.184.216.34');
    });

    await expect(assertSafeUrl('https://example.com')).resolves.toBeUndefined();
  });

  it('should bypass all checks for localhost in dev mode', async () => {
    process.env.NODE_ENV = 'development';

    await expect(assertSafeUrl('http://localhost:3000/api')).resolves.toBeUndefined();
    await expect(assertSafeUrl('http://127.0.0.1:3000/api')).resolves.toBeUndefined();
  });

  it('should bypass all checks for 127.0.0.1 in dev mode', async () => {
    process.env.NODE_ENV = 'development';

    await expect(assertSafeUrl('http://127.0.0.1:8080')).resolves.toBeUndefined();
  });
});
