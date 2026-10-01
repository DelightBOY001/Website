import type { NextRequest } from 'next/server';
import { recentEvents, subscribe, type RealtimeEvent } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

/**
 * GET /api/realtime?channels=global,tournament:<id>,user:<id>
 *
 * Server-Sent Events stream. Clients subscribe via EventSource and receive
 * live match results, bracket updates, payments and notifications without
 * refreshing. Falls back to polling on connection loss (client-side).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const channels = (url.searchParams.get('channels') ?? 'global')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const since = Number(url.searchParams.get('since') ?? 0);

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        if (!channels.includes(event.channel) && !channels.includes('global')) return;
        if (!channels.includes(event.channel) && event.channel !== 'global') {
          // allow wildcard-ish matching for typed channels
          const [base] = event.channel.split(':');
          if (!channels.includes(base ?? '')) return;
        }
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
            ),
          );
        } catch {
          cleanup?.();
        }
      };

      // Initial heartbeat + replay of recent events.
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ channels, ts: Date.now() })}\n\n`));
      for (const e of recentEvents(since)) send(e);

      const unsubscribe = subscribe(send);
      cleanup = unsubscribe;

      // Keep-alive comment every 25s (proxies kill idle streams).
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 25000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
