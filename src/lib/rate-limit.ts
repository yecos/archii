/**
 * rate-limit.ts
 * In-memory rate limiter for API routes.
 * Uses a sliding window counter per IP+endpoint.
 * No external dependencies — uses a Map with automatic cleanup.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime <= now) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Max requests in the window. Default: 30 */
  maxRequests?: number;
  /** Window duration in seconds. Default: 60 */
  windowSeconds?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (IP + endpoint).
 * Returns { success, remaining, resetAt }.
 *
 * Usage in API routes:
 *   const rateLimit = checkRateLimit(request, { maxRequests: 10, windowSeconds: 60 });
 *   if (!rateLimit.success) {
 *     return NextResponse.json({ error: 'Too many requests' }, {
 *       status: 429,
 *       headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) }
 *     });
 *   }
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig = {}
): RateLimitResult {
  cleanup();

  const { maxRequests = 30, windowSeconds = 60 } = config;
  const now = Date.now();

  // Build key from IP + URL
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const url = new URL(request.url).pathname;
  const key = `${ip}:${url}`;

  const entry = store.get(key);

  if (!entry || entry.resetTime <= now) {
    // New window
    const resetTime = now + windowSeconds * 1000;
    store.set(key, { count: 1, resetTime });
    return { success: true, remaining: maxRequests - 1, resetAt: resetTime };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetTime };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetTime };
}

/**
 * Create standard rate limit headers for responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
