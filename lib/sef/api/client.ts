// Low-level SEF HTTP client.
// - ApiKey header auth
// - 30s timeout
// - retry on 5xx / network errors (max 3 attempts, exponential backoff)
// - returns SefApiResponse with parsed JSON or raw text

import type { SefApiResponse, SefCredentials } from "../types";
import { baseUrl } from "./endpoints";
import { mapSefError } from "../error-map";

interface RequestArgs {
  creds: SefCredentials;
  method: "GET" | "POST" | "DELETE";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: string;
  contentType?: string;             // "application/xml" or "application/json"
  acceptJson?: boolean;
  idempotencyKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

function buildUrl(args: RequestArgs): string {
  const url = new URL(args.path, baseUrl(args.creds.isDemo));
  if (args.query) {
    for (const [k, v] of Object.entries(args.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function tryParseError(text: string): Promise<{ code?: string; message?: string }> {
  if (!text) return {};
  try {
    const json = JSON.parse(text);
    if (typeof json === "object" && json !== null) {
      const obj = json as Record<string, unknown>;
      const msg =
        (typeof obj.Message === "string" && obj.Message) ||
        (typeof obj.message === "string" && obj.message) ||
        (typeof obj.title === "string" && obj.title) ||
        (typeof obj.detail === "string" && obj.detail);
      const code =
        (typeof obj.Code === "string" && obj.Code) ||
        (typeof obj.code === "string" && obj.code) ||
        (typeof obj.type === "string" && obj.type);
      return { code: code || undefined, message: msg || undefined };
    }
  } catch {
    // Not JSON; return text as message.
  }
  return { message: text.slice(0, 500) };
}

async function rawCall<T>(args: RequestArgs): Promise<SefApiResponse<T>> {
  const url = buildUrl(args);
  const headers: Record<string, string> = {
    ApiKey: args.creds.apiKey,
    Accept: args.acceptJson === false ? "application/xml,application/json" : "application/json",
  };
  if (args.body && args.contentType) {
    headers["Content-Type"] = args.contentType;
  }
  if (args.idempotencyKey) {
    headers["Idempotency-Key"] = args.idempotencyKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    args.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method: args.method,
      headers,
      body: args.body,
      signal: controller.signal,
    });
    const text = await res.text();
    const duration = Date.now() - startedAt;

    if (!res.ok) {
      const { code, message } = await tryParseError(text);
      const mapped = mapSefError(res.status, message);
      return {
        ok: false,
        httpStatus: res.status,
        errorCode: code,
        errorMessage: mapped.userMessage,
        durationMs: duration,
        raw: text,
      };
    }

    // Try JSON, fall back to raw text.
    let data: T | undefined;
    if (text && headers.Accept.includes("application/json")) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // Some endpoints (e.g. /xml) return raw XML even when JSON is preferred.
      }
    }

    return {
      ok: true,
      httpStatus: res.status,
      data,
      durationMs: duration,
      raw: text,
    };
  } catch (err) {
    const duration = Date.now() - startedAt;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "SEF zahtev je istekao (timeout)."
        : err instanceof Error
          ? err.message
          : "Neuspela mreža.";
    return {
      ok: false,
      httpStatus: 0,
      errorCode: "NETWORK",
      errorMessage: message,
      durationMs: duration,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sefRequest<T = unknown>(args: RequestArgs): Promise<SefApiResponse<T>> {
  const max = args.maxRetries ?? DEFAULT_MAX_RETRIES;
  let last: SefApiResponse<T> | null = null;

  for (let attempt = 0; attempt < max; attempt++) {
    const result = await rawCall<T>(args);
    last = result;

    // Retry on network / 5xx / 429.
    const shouldRetry =
      !result.ok &&
      (result.httpStatus === 0 ||
        result.httpStatus === 429 ||
        result.httpStatus >= 500);

    if (!shouldRetry || attempt === max - 1) return result;

    // Exponential backoff: 500ms, 2000ms, 8000ms ...
    const delay = 500 * Math.pow(4, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return last!;
}
