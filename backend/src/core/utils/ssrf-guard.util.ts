import { lookup } from 'dns';
import ipaddr from 'ipaddr.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
]);

const BLOCKED_RANGES = new Set(['private', 'linkLocal', 'loopback', 'unspecified']);

/**
 * Validate that a URL is safe to fetch from — blocks private/link-local/loopback
 * and performs DNS resolution to prevent rebinding attacks.
 *
 * Called from two places:
 * 1. DTO validation (class-validator decorator) — at record-creation time
 * 2. Runtime validation (llm-client.service.ts) — at fetch time (TOCTOU defense)
 */
export async function assertSafeUrl(url: string): Promise<void> {
  // 1. Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfError(`Invalid URL: ${url}`);
  }

  const scheme = parsed.protocol.replace(':', '');
  if (scheme !== 'https') {
    throw new SsrfError(`Blocked: protocol '${scheme}' is not allowed (https only)`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Fast hostname blocklist (no DNS needed)
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfError(`Blocked: hostname '${hostname}' is not allowed`);
  }

  // 3. DNS resolution
  // TODO: also resolve with family:6 to catch IPv6-only private addresses
  const ip = await resolveDns(hostname);

  // 4. ipaddr.js range check
  const addr = ipaddr.parse(ip);
  const range = addr.range();
  if (BLOCKED_RANGES.has(range)) {
    throw new SsrfError(
      `Blocked: '${hostname}' resolves to ${ip} (range: ${range}) — private/link-local/loopback addresses are not allowed`,
    );
  }
}

function resolveDns(hostname: string): Promise<string> {
  return new Promise((resolve, reject) => {
    lookup(hostname, (err, address) => {
      if (err) {
        reject(new SsrfError(`DNS resolution failed for '${hostname}': ${err.message}`));
        return;
      }
      resolve(address);
    });
  });
}

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}
