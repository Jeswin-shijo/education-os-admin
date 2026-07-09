export function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function sortBy<T>(arr: T[], sel: (t: T) => number | string, dir: 'asc' | 'desc' = 'asc'): T[] {
  const sorted = [...arr].sort((a, b) => {
    const av = sel(a);
    const bv = sel(b);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

export function keyBy<T>(arr: T[], key: (t: T) => string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of arr) out[key(item)] = item;
  return out;
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function average(nums: number[]): number {
  return nums.length === 0 ? 0 : sum(nums) / nums.length;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

export function noop(): void {}
