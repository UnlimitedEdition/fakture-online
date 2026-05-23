import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

function build(prefix: string, max: number, windowSec: number) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    analytics: false,
    prefix: `fo:rl:${prefix}`,
  });
}

const limiters = {
  login: build("login", 5, 900),
  register: build("register", 3, 3600),
  signup: build("signup", 5, 3600),
  email: build("email", 20, 3600),
} as const;

export type LimiterKind = keyof typeof limiters;

export type RateLimitResult = {
  allowed: boolean;
  reset?: number;
  remaining?: number;
};

export async function checkRateLimit(
  kind: LimiterKind,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = limiters[kind];
  if (!limiter) {
    // Fail-open when Upstash not configured — local dev convenience.
    // In production both env vars MUST be set or every request is unlimited.
    return { allowed: true };
  }
  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    reset: result.reset,
    remaining: result.remaining,
  };
}
