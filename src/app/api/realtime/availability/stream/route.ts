import { getRealtimeEmitter } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const salonId = searchParams.get('salonId');
  if (!salonId) {
    return new Response(JSON.stringify({ error: 'Missing salonId query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const emitter = getRealtimeEmitter();
  const eventName = `availability:${salonId}`;
  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (payload: any) => {
        const data = `data: ${JSON.stringify({ type: 'availability_update', payload })}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          console.error("Stream enqueue error:", e);
        }
      };

      const listener = (payload: any) => {
        sendEvent(payload);
      };

      emitter.on(eventName, listener);

      // Heartbeat interval to keep connection alive
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch (e) {
          // Stream might be closed, clear interval
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      cleanup = () => {
        clearInterval(keepAliveInterval);
        emitter.off(eventName, listener);
      };
    },
    cancel() {
      if (cleanup) cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
