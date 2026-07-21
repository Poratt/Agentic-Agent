import { Injectable, HttpException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerRequest, ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';

@Injectable()
export class IdeasThrottlerGuard extends ThrottlerGuard {
  protected getWeight(req: Record<string, any>): number {
    const raw = req.body?.count ?? req.query?.count;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      return 1;
    }
    return Math.min(10, Math.max(1, Math.floor(n)));
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, getTracker, generateKey } = requestProps;
    const { req, res } = this.getRequestResponse(context);

    const ignoreUserAgents = throttler.ignoreUserAgents ?? this.commonOptions.ignoreUserAgents;
    if (Array.isArray(ignoreUserAgents)) {
      for (const pattern of ignoreUserAgents) {
        if (pattern.test(req.headers['user-agent'])) {
          return true;
        }
      }
    }

    const tracker = await getTracker(req, context);
    const key = generateKey(context, tracker, throttler.name);
    const weight = this.getWeight(req);

    let totalHits = 0;
    let timeToExpire = ttl;
    let isBlocked = false;
    let timeToBlockExpire = 0;

    for (let i = 0; i < weight; i += 1) {
      const record = await this.storageService.increment(key, ttl, limit, blockDuration, throttler.name);
      totalHits = record.totalHits;
      timeToExpire = record.timeToExpire;
      isBlocked = record.isBlocked;
      timeToBlockExpire = record.timeToBlockExpire;
      if (isBlocked) {
        break;
      }
    }

    const setHeaders = (throttler.setHeaders ?? this.commonOptions.setHeaders) ?? true;
    const suffix = (name: string) => (name === 'default' ? '' : `-${name}`);

    if (isBlocked) {
      if (setHeaders) {
        res.header(`Retry-After${suffix(throttler.name)}`, timeToBlockExpire);
      }
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }

    if (setHeaders) {
      res.header(`${this.headerPrefix}-Limit${suffix(throttler.name)}`, limit);
      res.header(`${this.headerPrefix}-Remaining${suffix(throttler.name)}`, Math.max(0, limit - totalHits));
      res.header(`${this.headerPrefix}-Reset${suffix(throttler.name)}`, timeToExpire);
    }

    return true;
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: 429,
        message: 'חרגת ממכסת הבקשות. נסה שוב בעוד דקה.',
        retryAfter: detail.timeToBlockExpire || 60,
      },
      429,
    );
  }
}
