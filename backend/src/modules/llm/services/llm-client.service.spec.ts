import { BadRequestException } from '@nestjs/common';
import { LlmClientService } from './llm-client.service';

// Mock DNS so assertSafeUrl can run without real network:
// private-looking hostnames resolve to themselves (private ranges),
// anything else resolves to a public IP (example.com).
jest.mock('dns', () => ({
  lookup: jest.fn((hostname: string, cb: (err: Error | null, ip: string) => void) => {
    const privateHosts = ['10.0.0.1', '192.168.1.5', '172.16.0.5', '169.254.169.254'];
    if (privateHosts.includes(hostname)) {
      cb(null, hostname);
      return;
    }
    // Loopback hostnames/literals resolve to the loopback address, mirroring
    // real dns.lookup behavior (dns.lookup('127.0.0.1') -> '127.0.0.1',
    // dns.lookup('localhost') -> '127.0.0.1').
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
      cb(null, '127.0.0.1');
      return;
    }
    cb(null, '93.184.216.34'); // public IP
  }),
}));

function makeService(): LlmClientService {
  return new LlmClientService({} as any, {} as any);
}

interface MockHeaders {
  get(name: string): string | null;
}

function makeResponse(partial: {
  status?: number;
  headers?: Record<string, string>;
  chunks?: Uint8Array[];
} = {}) {
  const { status = 200, headers = {}, chunks } = partial;
  const mockHeaders: MockHeaders = {
    get: (name: string) => headers[name.toLowerCase()] ?? null,
  };
  let body: ReadableStream<Uint8Array> | null = null;
  if (chunks) {
    body = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: mockHeaders,
    body,
    cancel: jest.fn(),
  };
}

describe('LlmClientService.downloadBuffer — C3 SSRF + size protection', () => {
  let service: LlmClientService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    service = makeService();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  it('rejects http:// (non-https) before any fetch', async () => {
    await expect((service as any).downloadBuffer('http://example.com/v.mp4')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects localhost before any fetch', async () => {
    await expect((service as any).downloadBuffer('https://localhost/v.mp4')).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects loopback / metadata IPs before any fetch', async () => {
    for (const url of ['https://127.0.0.1/v.mp4', 'https://169.254.169.254/v.mp4', 'https://0.0.0.0/v.mp4']) {
      await expect((service as any).downloadBuffer(url)).rejects.toThrow(BadRequestException);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects RFC1918 hosts resolved via DNS (10.x / 192.168.x / 172.16-31.x)', async () => {
    for (const host of ['10.0.0.1', '192.168.1.5', '172.16.0.5']) {
      await expect((service as any).downloadBuffer(`https://${host}/v.mp4`)).rejects.toThrow(BadRequestException);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads a safe https URL with redirect: manual', async () => {
    fetchMock.mockResolvedValue(makeResponse({ chunks: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])] }));

    const buf = await (service as any).downloadBuffer('https://example.com/v.mp4');

    expect(Buffer.from(buf)).toEqual(Buffer.from([1, 2, 3, 4, 5]));
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/v.mp4', expect.objectContaining({ redirect: 'manual' }));
  });

  it('rejects when Content-Length exceeds the 100MB cap (before reading body)', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ headers: { 'content-length': String(101 * 1024 * 1024) } }),
    );

    await expect((service as any).downloadBuffer('https://example.com/v.mp4')).rejects.toThrow(BadRequestException);
  });

  it('rejects when streamed bytes exceed the 100MB cap (no content-length)', async () => {
    const bigChunk = new Uint8Array(101 * 1024 * 1024);
    fetchMock.mockResolvedValue(makeResponse({ chunks: [bigChunk] }));

    await expect((service as any).downloadBuffer('https://example.com/v.mp4')).rejects.toThrow(BadRequestException);
  });

  it('follows a redirect to a safe host and re-validates', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ status: 302, headers: { location: 'https://example.com/v2.mp4' } }))
      .mockResolvedValueOnce(makeResponse({ chunks: [new Uint8Array([9])] }));

    const buf = await (service as any).downloadBuffer('https://example.com/v.mp4');

    expect(Buffer.from(buf)).toEqual(Buffer.from([9]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('blocks a redirect that points to a private host (no silent follow)', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse({ status: 302, headers: { location: 'http://10.0.0.1/internal.mp4' } }),
    );

    await expect((service as any).downloadBuffer('https://example.com/v.mp4')).rejects.toThrow(BadRequestException);
    // only the initial hop reached fetch; the redirect target was rejected before fetching
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks a multi-hop redirect chain that lands on a private host', async () => {
    fetchMock
      .mockResolvedValueOnce(makeResponse({ status: 301, headers: { location: '/internal.mp4' } }))
      .mockResolvedValueOnce(makeResponse({ status: 302, headers: { location: 'http://192.168.1.5/x' } }));

    await expect((service as any).downloadBuffer('https://example.com/a.mp4')).rejects.toThrow(BadRequestException);
    // hops 1-2 fetched (relative + 302), the private target was rejected before a third fetch
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('LlmClientService.extendVideo — C3 SSRF on sourceVideoUrl', () => {
  let service: LlmClientService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    service = makeService();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  it('rejects a user-supplied private sourceVideoUrl', async () => {
    await expect(
      service.extendVideo({
        provider: 'agnes-ai',
        model: 'agnes-video',
        sourceVideoUrl: 'http://127.0.0.1/v.mp4',
        prompt: 'continue',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a user-supplied localhost sourceVideoUrl', async () => {
    await expect(
      service.extendVideo({
        provider: 'agnes-ai',
        model: 'agnes-video',
        sourceVideoUrl: 'https://localhost/v.mp4',
        prompt: 'continue',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
