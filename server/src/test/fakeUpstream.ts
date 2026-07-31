import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A stand-in for the Anthropic API.
 *
 * The SDK streams, so this speaks SSE. It exists so the proxy's own behaviour —
 * validation, error mapping, schema enforcement, fallback degradation — can be
 * tested without a network call or an API key.
 */
export interface UpstreamBehaviour {
  /** Text the model "returns". Usually a JSON string. */
  text?: string;
  stopReason?: 'end_turn' | 'max_tokens' | 'refusal';
  stopDetails?: { type: string; category?: string };
  /** Respond with this HTTP status instead of streaming. */
  errorStatus?: number;
  errorBody?: unknown;
  /** Fail only when the request carries fallback beta params. */
  rejectFallbackParams?: boolean;
  model?: string;
  /** Marks the turn as served by a fallback model. */
  servedByFallback?: boolean;
}

export interface FakeUpstream {
  url: string;
  close: () => Promise<void>;
  /** Bodies of every request received, in order. */
  requests: Array<Record<string, unknown>>;
  /** Headers of every request received, in order. Beta flags travel here, not in the body. */
  headers: Array<Record<string, string | string[] | undefined>>;
  setBehaviour: (behaviour: UpstreamBehaviour) => void;
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function startFakeUpstream(initial: UpstreamBehaviour = {}): Promise<FakeUpstream> {
  let behaviour: UpstreamBehaviour = initial;
  const requests: Array<Record<string, unknown>> = [];
  const headers: Array<Record<string, string | string[] | undefined>> = [];

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(raw || '{}') as Record<string, unknown>;
      } catch {
        // Leave body empty; the assertions will notice.
      }
      requests.push(body);
      headers.push({ ...req.headers });

      // The SDK turns `betas` into the anthropic-beta header; `fallbacks` stays in the body.
      const carriesFallback =
        body.fallbacks !== undefined || req.headers['anthropic-beta'] !== undefined;
      if (behaviour.rejectFallbackParams && carriesFallback) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            type: 'error',
            error: { type: 'invalid_request_error', message: 'fallbacks is not supported for this account' },
          }),
        );
        return;
      }

      if (behaviour.errorStatus) {
        res.writeHead(behaviour.errorStatus, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify(
            behaviour.errorBody ?? {
              type: 'error',
              error: { type: 'api_error', message: 'upstream failure' },
            },
          ),
        );
        return;
      }

      const model = behaviour.model ?? 'claude-opus-5';
      const text = behaviour.text ?? '{}';
      const stopReason = behaviour.stopReason ?? 'end_turn';

      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });

      res.write(
        sse('message_start', {
          type: 'message_start',
          message: {
            id: 'msg_test',
            type: 'message',
            role: 'assistant',
            model,
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: {
              input_tokens: 120,
              output_tokens: 0,
              ...(behaviour.servedByFallback
                ? { iterations: [{ type: 'message' }, { type: 'fallback_message' }] }
                : {}),
            },
          },
        }),
      );

      // A refusal before any output produces no content blocks at all.
      if (stopReason !== 'refusal') {
        res.write(
          sse('content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' },
          }),
        );
        res.write(
          sse('content_block_delta', {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text },
          }),
        );
        res.write(sse('content_block_stop', { type: 'content_block_stop', index: 0 }));
      }

      res.write(
        sse('message_delta', {
          type: 'message_delta',
          delta: {
            stop_reason: stopReason,
            stop_sequence: null,
            ...(behaviour.stopDetails ? { stop_details: behaviour.stopDetails } : {}),
          },
          usage: { output_tokens: 400 },
        }),
      );
      res.write(sse('message_stop', { type: 'message_stop' }));
      res.end();
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    headers,
    setBehaviour: (next) => {
      behaviour = next;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        // The SDK holds keep-alive sockets open; close() alone would never resolve.
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
