import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

// The rate-limit module uses a module-level Map, so state persists between tests.
// We need to reset the module state between describe blocks.
// Since we can't easily reset module state, we use unique IPs per test.

function mockRequest(ip = '127.0.0.1', url = 'http://localhost/api/test'): Request {
  return new Request(url, { headers: { 'x-forwarded-for': ip } });
}

describe('checkRateLimit', () => {
  it('first request succeeds with remaining = maxRequests - 1', () => {
    const req = mockRequest('192.168.1.1', 'http://localhost/api/first');
    const result = checkRateLimit(req, { maxRequests: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('requests up to limit all succeed', () => {
    const url = 'http://localhost/api/limit-test';
    for (let i = 0; i < 10; i++) {
      const req = mockRequest('10.0.0.1', url);
      const result = checkRateLimit(req, { maxRequests: 10, windowSeconds: 60 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  it('request beyond limit fails with remaining=0', () => {
    const ip = '10.0.0.2';
    const url = 'http://localhost/api/over-limit';

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(mockRequest(ip, url), { maxRequests: 5, windowSeconds: 60 });
    }

    // Next request should fail
    const result = checkRateLimit(mockRequest(ip, url), { maxRequests: 5, windowSeconds: 60 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('different IPs have independent counters', () => {
    const url = 'http://localhost/api/ip-test';

    const result1 = checkRateLimit(mockRequest('ip-a', url), { maxRequests: 1, windowSeconds: 60 });
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(0);

    // ip-a should now be rate limited
    const result1b = checkRateLimit(mockRequest('ip-a', url), { maxRequests: 1, windowSeconds: 60 });
    expect(result1b.success).toBe(false);

    // ip-b should be fresh
    const result2 = checkRateLimit(mockRequest('ip-b', url), { maxRequests: 1, windowSeconds: 60 });
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(0);
  });

  it('different URLs have independent counters', () => {
    const ip = '10.0.0.3';

    const result1 = checkRateLimit(mockRequest(ip, 'http://localhost/api/url-a'), { maxRequests: 1, windowSeconds: 60 });
    expect(result1.success).toBe(true);

    // url-a should now be rate limited
    const result1b = checkRateLimit(mockRequest(ip, 'http://localhost/api/url-a'), { maxRequests: 1, windowSeconds: 60 });
    expect(result1b.success).toBe(false);

    // url-b should be fresh
    const result2 = checkRateLimit(mockRequest(ip, 'http://localhost/api/url-b'), { maxRequests: 1, windowSeconds: 60 });
    expect(result2.success).toBe(true);
  });

  it('counter resets after reset time', async () => {
    const ip = '10.0.0.4';
    const url = 'http://localhost/api/reset-test';
    const windowMs = 100; // Very short window for testing

    // Exhaust limit
    checkRateLimit(mockRequest(ip, url), { maxRequests: 1, windowSeconds: 0.1 });

    // Should be rate limited
    const blocked = checkRateLimit(mockRequest(ip, url), { maxRequests: 1, windowSeconds: 0.1 });
    expect(blocked.success).toBe(false);

    // Wait for reset
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should succeed now
    const result = checkRateLimit(mockRequest(ip, url), { maxRequests: 1, windowSeconds: 0.1 });
    expect(result.success).toBe(true);
  });

  it('uses x-real-ip when x-forwarded-for is missing', () => {
    const req = new Request('http://localhost/api/real-ip', {
      headers: { 'x-real-ip': '1.2.3.4' },
    });
    const result = checkRateLimit(req, { maxRequests: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
  });

  it('falls back to "unknown" when no IP headers present', () => {
    const req = new Request('http://localhost/api/unknown-ip');
    const result = checkRateLimit(req, { maxRequests: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
  });
});

describe('getRateLimitHeaders', () => {
  it('returns correct header names and values', () => {
    const result = {
      success: true,
      remaining: 25,
      resetAt: 1700000000000,
    };
    const headers = getRateLimitHeaders(result);

    expect(headers).toHaveProperty('X-RateLimit-Remaining');
    expect(headers).toHaveProperty('X-RateLimit-Reset');
    expect(headers['X-RateLimit-Remaining']).toBe('25');
    expect(headers['X-RateLimit-Reset']).toBe('1700000000');
  });

  it('returns remaining as string', () => {
    const headers = getRateLimitHeaders({ success: false, remaining: 0, resetAt: 0 });
    expect(typeof headers['X-RateLimit-Remaining']).toBe('string');
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });

  it('returns resetAt as seconds (not ms)', () => {
    const headers = getRateLimitHeaders({ success: true, remaining: 10, resetAt: 1700000050000 });
    expect(headers['X-RateLimit-Reset']).toBe('1700000050');
  });
});
