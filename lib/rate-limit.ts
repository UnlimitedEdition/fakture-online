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
  login: build("login", 5, 900),                  // 5 / 15min
  register: build("register", 3, 3600),           // 3 / hour
  signup: build("signup", 5, 3600),               // 5 / hour
  email: build("email", 20, 3600),                // 20 / hour
  passwordReset: build("pwreset", 3, 3600),       // 3 / hour
  invoiceMutate: build("inv.mutate", 60, 3600),   // 60 / hour
  sefSend: build("sef.send", 30, 3600),           // 30 / hour
  sefPoll: build("sef.poll", 60, 3600),           // 60 / hour
  sefCallback: build("sef.cb", 30, 60),           // 30 / minute (per IP+userId)
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
    // Fail-CLOSED in production. Fail-OPEN only in development convenience.
    if (process.env.NODE_ENV === "production") {
      console.error("[rate-limit] Upstash not configured in production — denying", { kind });
      return { allowed: false };
    }
    return { allowed: true };
  }
  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    reset: result.reset,
    remaining: result.remaining,
  };
}
