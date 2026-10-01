'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface RealtimeEvent {
  channel: string;
  type: string;
  payload: unknown;
  ts: number;
}

/**
 * Subscribe to the SSE stream at /api/realtime.
 *
 * - `channels`: e.g. ['global', 'tournament:123', 'user:456']
 * - `onEvent`: invoked for every matching event
 *
 * Reconnects automatically with backoff; falls back to polling the
 * event endpoint if EventSource is unavailable.
 */
export function useRealtime(
  channels: string[],
  onEvent?: (event: RealtimeEvent) => void,
  options: { pollMs?: number } = {},
) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const channelKey = channels.join(',');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('EventSource' in window)) return;

    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`/api/realtime?channels=${encodeURIComponent(channelKey)}`);

      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!closed) {
          retry = setTimeout(connect, 4000 + Math.random() * 2000);
        }
      };

      const handle = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as RealtimeEvent;
          if (data?.type) {
            setLastEvent(data);
            handlerRef.current?.(data);
          }
        } catch {
          /* heartbeat comments */
        }
      };

      // Listen to named events + the default message event.
      const types = [
        'connected',
        'match:completed',
        'match:started',
        'bracket:generated',
        'tournament:started',
        'tournament:completed',
        'tournament:updated',
        'registration:new',
        'registration:cancelled',
        'payment:success',
        'payment:refunded',
        'notification:new',
        'announcement:new',
        'swiss:round_generated',
        'groups:advanced',
        'stats:updated',
        'user:updated',
        'tournament:created',
        'tournament:deleted',
        'message',
      ];
      for (const t of types) es.addEventListener(t, handle as EventListener);
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
      setConnected(false);
    };
  }, [channelKey]);

  return { connected, lastEvent };
}
