// In-memory idempotency cache for MVP
// In production: swap to Redis with TTL

const cache = new Map<string, { result: unknown; expiresAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getIdempotentResult(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.result;
}

export function setIdempotentResult(key: string, result: unknown): void {
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
}

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, 10 * 60 * 1000);
