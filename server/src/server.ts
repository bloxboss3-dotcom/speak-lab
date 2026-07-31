import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type Anthropic from '@anthropic-ai/sdk';
import type { Config } from './config.js';
import { CoachingError, runCoachingTask, type CoachingMessage, type CoachingRequest } from './coach.js';
import { isCoachingTask } from './schemas.js';

const MAX_SYSTEM_CHARS = 40_000;
const MAX_TOTAL_MESSAGE_CHARS = 120_000;
const MAX_MESSAGES = 60;
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

/** Fixed-window limiter. Adequate for a single-user deployment; put a real one in front for anything larger. */
class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();

  constructor(private readonly perMinute: number) {}

  check(key: string, now = Date.now()): boolean {
    const window = 60_000;
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= window) {
      this.hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= this.perMinute) return false;
    entry.count += 1;
    return true;
  }

  /** Drops stale buckets so a long-lived process doesn't grow unbounded. */
  sweep(now = Date.now()): void {
    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart > 120_000) this.hits.delete(key);
    }
  }
}

function parseRequest(body: unknown): CoachingRequest {
  if (typeof body !== 'object' || body === null) {
    throw new CoachingError(400, 'bad_request', 'Body must be a JSON object.');
  }
  const raw = body as Record<string, unknown>;

  if (!isCoachingTask(raw.task)) {
    throw new CoachingError(400, 'unknown_task', `Unknown task: ${String(raw.task)}`);
  }

  const system = raw.system;
  if (typeof system !== 'string' || system.trim().length === 0) {
    throw new CoachingError(400, 'bad_request', 'system must be a non-empty string.');
  }
  if (system.length > MAX_SYSTEM_CHARS) {
    throw new CoachingError(413, 'too_large', 'system prompt is too long.');
  }

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    throw new CoachingError(400, 'bad_request', 'messages must be a non-empty array.');
  }
  if (raw.messages.length > MAX_MESSAGES) {
    throw new CoachingError(413, 'too_large', 'Too many messages in one request.');
  }

  let totalChars = 0;
  const messages: CoachingMessage[] = raw.messages.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new CoachingError(400, 'bad_request', `messages[${index}] must be an object.`);
    }
    const item = entry as Record<string, unknown>;
    if (item.role !== 'user' && item.role !== 'assistant') {
      throw new CoachingError(400, 'bad_request', `messages[${index}].role must be user or assistant.`);
    }
    if (typeof item.content !== 'string' || item.content.length === 0) {
      throw new CoachingError(400, 'bad_request', `messages[${index}].content must be a non-empty string.`);
    }
    totalChars += item.content.length;
    return { role: item.role, content: item.content };
  });

  if (totalChars > MAX_TOTAL_MESSAGE_CHARS) {
    throw new CoachingError(413, 'too_large', 'Conversation payload is too long.');
  }

  // The Messages API requires the first turn to be from the user.
  if (messages[0]?.role !== 'user') {
    throw new CoachingError(400, 'bad_request', 'The first message must be from the user.');
  }

  let maxTokens: number | undefined;
  if (raw.maxTokens !== undefined) {
    if (typeof raw.maxTokens !== 'number' || !Number.isFinite(raw.maxTokens) || raw.maxTokens < 256) {
      throw new CoachingError(400, 'bad_request', 'maxTokens must be a number of at least 256.');
    }
    maxTokens = Math.floor(raw.maxTokens);
  }

  let effort: CoachingRequest['effort'];
  if (raw.effort !== undefined) {
    if (typeof raw.effort !== 'string' || !EFFORTS.has(raw.effort)) {
      throw new CoachingError(400, 'bad_request', 'effort must be one of low, medium, high, xhigh, max.');
    }
    effort = raw.effort as CoachingRequest['effort'];
  }

  return { task: raw.task, system, messages, maxTokens, effort };
}

export function createServer(config: Config, client: Anthropic): Express {
  const app = express();
  const limiter = new RateLimiter(config.requestsPerMinute);
  const sweeper = setInterval(() => limiter.sweep(), 120_000);
  // Never hold the process open just to run the sweeper.
  if (typeof sweeper.unref === 'function') sweeper.unref();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      model: config.model,
      refusalFallback: config.refusalFallback,
      requiresClientSecret: Boolean(config.clientSecret),
    });
  });

  app.post('/v1/coach', async (req: Request, res: Response) => {
    try {
      if (config.clientSecret) {
        const provided = req.header('x-speaklab-key');
        if (provided !== config.clientSecret) {
          throw new CoachingError(401, 'unauthorized', 'Missing or incorrect x-speaklab-key.');
        }
      }

      const key = config.clientSecret ?? req.ip ?? 'anonymous';
      if (!limiter.check(key)) {
        throw new CoachingError(429, 'rate_limited', 'Too many requests. Slow down.');
      }

      const request = parseRequest(req.body);
      const started = Date.now();
      const result = await runCoachingTask(client, config, request);

      console.log(
        `[coach] task=${request.task} model=${result.model} in=${result.usage.inputTokens} ` +
          `out=${result.usage.outputTokens} fallback=${result.servedByFallback} ms=${Date.now() - started}`,
      );

      res.json({
        data: result.data,
        model: result.model,
        usage: result.usage,
        servedByFallback: result.servedByFallback,
      });
    } catch (error) {
      const coachingError =
        error instanceof CoachingError
          ? error
          : new CoachingError(500, 'internal', 'Unexpected proxy error.');

      if (coachingError.status >= 500) {
        console.error('[coach] error', coachingError.code, coachingError.message, coachingError.detail ?? '');
      }

      res.status(coachingError.status).json({
        error: {
          code: coachingError.code,
          message: coachingError.message,
          detail: coachingError.detail,
        },
      });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'No such endpoint.' } });
  });

  // Express needs the four-argument shape to recognise an error handler.
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: { code: 'bad_json', message: 'Request body was not valid JSON.' } });
      return;
    }
    console.error('[coach] unhandled', error);
    res.status(500).json({ error: { code: 'internal', message: 'Unexpected proxy error.' } });
  });

  return app;
}
