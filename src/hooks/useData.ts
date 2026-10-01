'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Generic client-side data hook with loading/error/retry states. */
export function useFetch<T>(url: string | null, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
        }
        if (alive) setData(json as T);
      })
      .catch((err) => {
        if (alive) {
          setData(null);
          setError(err instanceof Error && err.message ? err.message : 'Something went wrong');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, refetch };
}

/** POST/PUT/PATCH/DELETE helper with JSON + toast-friendly errors. */
export async function api<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json as T;
}
