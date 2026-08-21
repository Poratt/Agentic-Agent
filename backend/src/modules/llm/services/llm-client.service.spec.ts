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

describe('LlmClientService.createVideoTask — transient retry on queue_full/5xx', () => {
  let service: LlmClientService;
  const fetchMock = jest.fn();

  function makeMockResponse(opts: {
    status: number;
    body?: unknown;
    text?: string;
    headers?: Record<string, string>;
  }) {
    const text = opts.text ?? (opts.body !== undefined ? JSON.stringify(opts.body) : '');
    const json = opts.body ?? (opts.text ? JSON.parse(opts.text) : {});
    const headers = opts.headers ?? {};
    return {
      status: opts.status,
      ok: opts.status >= 200 && opts.status < 300,
      headers: {
        get: (name: string): string | null => {
          const key = name.toLowerCase();
          return Object.prototype.hasOwnProperty.call(headers, key)
            ? headers[key]
            : null;
        },
      },
      text: async () => text,
      json: async () => json,
    };
  }

  beforeEach(() => {
    service = makeService();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    // Stub provider resolution so the test never touches DB / DNS.
    jest.spyOn(service as any, 'assertCapability').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getProviderConnection').mockResolvedValue({
      baseUrl: 'https://api.agnes-ai.com/v1',
      apiKey: 'test-key',
      dbProvider: { key: 'agnes-ai' },
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const baseRequest = {
    provider: 'agnes-ai',
    model: 'agnes-video',
    prompt: 'a calm ocean wave',
  };

  it('retries up to 3 times on 503 + video_queue_full, then throws the original error', async () => {
    fetchMock.mockResolvedValue(
      makeMockResponse({
        status: 503,
        body: { code: 'video_queue_full', message: 'video queue is full, please retry later' },
      }),
    );

    const promise = service.createVideoTask(baseRequest);
    const expectation = expect(promise).rejects.toThrow(/Agnes video creation failed \(503\)/);
    await jest.advanceTimersByTimeAsync(5_000);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 4xx (terminal client error)', async () => {
    fetchMock.mockResolvedValue(
      makeMockResponse({ status: 400, body: { code: 'bad_request', message: 'invalid model' } }),
    );

    await expect(service.createVideoTask(baseRequest)).rejects.toThrow(/Agnes video creation failed \(400\)/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries up to 3 times on generic 5xx (non-queue_full body)', async () => {
    fetchMock.mockResolvedValue(
      makeMockResponse({ status: 500, body: { code: 'internal_error', message: 'oops' } }),
    );

    const promise = service.createVideoTask(baseRequest);
    const expectation = expect(promise).rejects.toThrow(/Agnes video creation failed \(500\)/);
    await jest.advanceTimersByTimeAsync(5_000);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('succeeds on attempt 2 after a transient 503 (queue_full)', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeMockResponse({
          status: 503,
          body: { code: 'video_queue_full', message: 'video queue is full, please retry later' },
        }),
      )
      .mockResolvedValueOnce(
        makeMockResponse({ status: 200, body: { video_id: 'vid_ok', status: 'queued' } }),
      );

    const promise = service.createVideoTask(baseRequest);
    await jest.advanceTimersByTimeAsync(5_000);
    const result = await promise;
    expect(result.videoId).toBe('vid_ok');
    expect(result.status).toBe('queued');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries transport errors (TypeError) and succeeds on attempt 2', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        makeMockResponse({ status: 200, body: { video_id: 'vid_t', status: 'queued' } }),
      );

    const promise = service.createVideoTask(baseRequest);
    await jest.advanceTimersByTimeAsync(5_000);
    const result = await promise;
    expect(result.videoId).toBe('vid_t');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once on 429 with Retry-After=2s, succeeds on attempt 2', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeMockResponse({
          status: 429,
          body: { code: 'rate_limit_exceeded', message: 'allows 2 requests per 1 minute' },
          headers: { 'retry-after': '2' },
        }),
      )
      .mockResolvedValueOnce(
        makeMockResponse({ status: 200, body: { video_id: 'vid_429', status: 'queued' } }),
      );

    const promise = service.createVideoTask(baseRequest);
    await jest.advanceTimersByTimeAsync(35_000); // covers Retry-After=2s plus slack
    const result = await promise;
    expect(result.videoId).toBe('vid_429');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 429 when no Retry-After header is present (terminal)', async () => {
    fetchMock.mockResolvedValue(
      makeMockResponse({
        status: 429,
        body: { code: 'rate_limit_exceeded', message: 'no header' },
      }),
    );

    await expect(service.createVideoTask(baseRequest)).rejects.toThrow(
      /Agnes video creation failed \(429\)/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 429 when Retry-After=45 exceeds the 30s cap (terminal)', async () => {
    fetchMock.mockResolvedValue(
      makeMockResponse({
        status: 429,
        body: { code: 'rate_limit_exceeded', message: 'wait too long' },
        headers: { 'retry-after': '45' },
      }),
    );

    await expect(service.createVideoTask(baseRequest)).rejects.toThrow(
      /Agnes video creation failed \(429\)/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429 followed by 429 — second one is terminal (single Retry-After budget exhausted)', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeMockResponse({
          status: 429,
          body: { code: 'rate_limit_exceeded', message: '1st' },
          headers: { 'retry-after': '1' },
        }),
      )
      .mockResolvedValueOnce(
        makeMockResponse({
          status: 429,
          body: { code: 'rate_limit_exceeded', message: '2nd' },
          headers: { 'retry-after': '1' },
        }),
      );

    const promise = service.createVideoTask(baseRequest);
    const expectation = expect(promise).rejects.toThrow(/Agnes video creation failed \(429\)/);
    await jest.advanceTimersByTimeAsync(5_000); // first 1s wait
    await expectation;
    // First 429 honored the Retry-After; second 429 finds the budget empty → terminal.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

