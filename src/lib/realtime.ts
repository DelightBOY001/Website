/**
 * Real-time event bus + Server-Sent Events fan-out.
 *
 * Server code calls `publishEvent(channel, event)` whenever something changes
 * (match result, payment, announcement, bracket update…). Connected browsers
 * subscribe via `GET /api/realtime?channels=...` and receive SSE frames.
 *
 * For multi-instance deployments swap this module for Redis pub/sub, Pusher or
 * Ably — the exported interface stays identical.
 */

export type RealtimeChannel =
  | 'global'
  | 'tournament'
  | 'matches'
  | 'payments'
  | 'notifications'
  | 'admin';

export interface RealtimeEvent {
  channel: string; // e.g. `tournament:64f…` or a top-level channel name
  type: string; // e.g. `match:completed`
  payload: unknown;
  ts: number;
}

type Listener = (event: RealtimeEvent) => void;

declare global {
  // eslint-disable-next-line no-var
  var __nexusEvents:
    | {
        listeners: Set<Listener>;
        history: RealtimeEvent[];
      }
    | undefined;
}

const bus =
  globalThis.__nexusEvents ??
  (globalThis.__nexusEvents = {
    listeners: new Set<Listener>(),
    history: [],
  });

const HISTORY_LIMIT = 200;

export function publishEvent(channel: string, type: string, payload: unknown = {}): RealtimeEvent {
  const event: RealtimeEvent = { channel, type, payload, ts: Date.now() };
  bus.history.push(event);
  if (bus.history.length > HISTORY_LIMIT) bus.history.splice(0, bus.history.length - HISTORY_LIMIT);
  for (const listener of bus.listeners) {
    try {
      listener(event);
    } catch (err) {
      console.error('[realtime] listener error:', err);
    }
  }
  return event;
}

export function subscribe(listener: Listener): () => void {
  bus.listeners.add(listener);
  return () => bus.listeners.delete(listener);
}

export function recentEvents(sinceTs = 0): RealtimeEvent[] {
  return bus.history.filter((e) => e.ts > sinceTs);
}

/** Convenience publishers used across services. */
export const realtime = {
  tournament(tournamentId: string, type: string, payload?: unknown) {
    publishEvent(`tournament:${tournamentId}`, type, payload);
    publishEvent('tournament', type, { tournamentId, ...(payload as object) });
  },
  match(tournamentId: string, type: string, payload?: unknown) {
    publishEvent(`tournament:${tournamentId}`, type, payload);
    publishEvent('matches', type, { tournamentId, ...(payload as object) });
  },
  payment(userId: string, type: string, payload?: unknown) {
    publishEvent(`user:${userId}`, type, payload);
    publishEvent('payments', type, { userId, ...(payload as object) });
  },
  notification(userId: string, payload?: unknown) {
    publishEvent(`user:${userId}`, 'notification:new', payload);
  },
  admin(type: string, payload?: unknown) {
    publishEvent('admin', type, payload);
    publishEvent('global', type, payload);
  },
};
