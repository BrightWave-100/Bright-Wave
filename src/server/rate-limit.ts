import { NextFunction, Response } from 'express';
import { AuthenticatedArenaRequest } from './auth.js';

interface Bucket {
  count: number;
  windowStart: number;
}

export interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
}

// In-memory counters. Each serverless instance keeps its own, so these are a
// per-instance ceiling, not a global one. Use a shared store if you need a
// strict global limit.
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweepExpired(now: number, windowMs: number): void {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= windowMs) {
      buckets.delete(key);
    }
  }
}

/**
 * Limits requests per client IP and per anonymous credential. Must run after
 * anonymousCredentialMiddleware, which sets req.clientIp and req.anonUid.
 */
export function createRateLimiter(opts: RateLimitOptions) {
  return (req: AuthenticatedArenaRequest, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweepExpired(now, opts.windowMs);

    const keys = [
      `${opts.name}:ip:${req.clientIp ?? 'unknown'}`,
      `${opts.name}:anon:${req.anonUid ?? 'none'}`,
    ];

    let limited = false;
    for (const key of keys) {
      let bucket = buckets.get(key);
      if (!bucket || now - bucket.windowStart >= opts.windowMs) {
        bucket = { count: 0, windowStart: now };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > opts.max) {
        limited = true;
      }
    }

    if (limited) {
      res.setHeader('Retry-After', String(Math.ceil(opts.windowMs / 1000)));
      res.status(429).json({
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    next();
  };
}

export function resetRateLimitsForTesting(): void {
  buckets.clear();
  lastSweep = 0;
}
