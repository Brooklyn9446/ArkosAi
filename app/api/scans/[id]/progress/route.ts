import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerProgressStream, unregisterProgressStream } from '@/lib/queue/worker';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const scanId = params.id;

  // Create a ReadableStream that stays open and receives
  // progress updates from the worker via the registered callback
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send an initial connected message so the frontend
      // knows the SSE connection is established
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ stage: 'connected' })}\n\n`)
      );

      // Register this stream so the worker can push to it
      registerProgressStream(scanId, (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (err) {
          // If controller is closed, we might get an error. Clean up just in case.
          console.warn('[SSE Progress] Failed to enqueue data, closing stream:', err);
          unregisterProgressStream(scanId);
        }
      });

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        unregisterProgressStream(scanId);
        try {
          controller.close();
        } catch {
          // Stream might already be closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
