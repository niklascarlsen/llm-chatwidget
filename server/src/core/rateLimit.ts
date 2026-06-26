// Sliding window: max N requests per key per windowMs.
export interface RateLimiter {
  take(key: string): boolean;
}

export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();

  const take = (key: string): boolean => {
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }

    recent.push(now);
    hits.set(key, recent);
    return true;
  };

  // Sweep stale keys so the map doesn't grow forever. unref so shutdown isn't blocked.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, times] of hits) {
      if (times.every((t) => t <= cutoff)) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return {take};
}
