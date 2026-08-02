import Anthropic from '@anthropic-ai/sdk';
import { Ajv, type ValidateFunction } from 'ajv';
import type { Config } from './config.js';
import { TASK_SCHEMAS, type CoachingTask } from './schemas.js';

export interface CoachingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachingRequest {
  task: CoachingTask;
  system: string;
  messages: CoachingMessage[];
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface CoachingResult {
  data: unknown;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  /** True when a refusal was rescued by the fallback model. */
  servedByFallback: boolean;
}

export class CoachingError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'CoachingError';
  }
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = new Map<CoachingTask, ValidateFunction>();

function validatorFor(task: CoachingTask): ValidateFunction {
  const existing = validators.get(task);
  if (existing) return existing;
  const compiled = ajv.compile(TASK_SCHEMAS[task] as object);
  validators.set(task, compiled);
  return compiled;
}

/** Beta flag for the `fallbacks: "default"` scalar form. */
const REFUSAL_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function createClient(config: Config): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.requestTimeoutMs,
    maxRetries: 2,
  });
}

/**
 * Runs one coaching task and returns validated JSON.
 *
 * Structured outputs constrain the response shape at the API, and the schema
 * is re-checked here before anything reaches the app. Streaming is used even
 * though the app wants a single JSON object: it is what stops a slow
 * high-effort turn from dying on an idle-connection timeout.
 */
export async function runCoachingTask(
  client: Anthropic,
  config: Config,
  request: CoachingRequest,
): Promise<CoachingResult> {
  const schema = TASK_SCHEMAS[request.task];
  const maxTokens = Math.min(request.maxTokens ?? 4000, config.maxTokensCeiling);

  const params = {
    model: config.model,
    max_tokens: maxTokens,
    system: request.system,
    messages: request.messages,
    output_config: {
      effort: request.effort ?? 'medium',
      format: { type: 'json_schema' as const, schema },
    },
  };

  let message: Anthropic.Message;
  let usedFallbackParams = config.refusalFallback;

  try {
    message = await send(client, params, usedFallbackParams);
  } catch (error) {
    // If the deployment's account or model doesn't accept the fallback beta,
    // degrade to a plain request rather than failing the learner's session.
    if (usedFallbackParams && isBadRequestAboutFallbacks(error)) {
      console.warn('[coach] refusal-fallback rejected by API; retrying without it');
      usedFallbackParams = false;
      message = await send(client, params, false);
    } else {
      throw toCoachingError(error);
    }
  }

  if (message.stop_reason === 'refusal') {
    // Best-effort: the streaming accumulator does not currently carry
    // stop_details through, so the category is often absent. The 422 itself is
    // what the app acts on; the category is only ever extra context for logs.
    const category = (message as { stop_details?: { category?: string } }).stop_details?.category;
    throw new CoachingError(
      422,
      'refused',
      'The model declined this request.',
      category ? `category: ${category}` : undefined,
    );
  }

  if (message.stop_reason === 'max_tokens') {
    throw new CoachingError(
      502,
      'truncated',
      'The response was cut off before the JSON was complete.',
      `max_tokens: ${maxTokens}`,
    );
  }

  // Thinking blocks precede the answer, so never index content[0] blindly.
  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  if (!textBlock) {
    throw new CoachingError(502, 'empty_response', 'The model returned no text content.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new CoachingError(
      502,
      'invalid_json',
      'The model response was not valid JSON.',
      textBlock.text.slice(0, 200),
    );
  }

  const validate = validatorFor(request.task);
  if (!validate(parsed)) {
    const first = validate.errors?.[0];
    throw new CoachingError(
      502,
      'schema_mismatch',
      'The model response did not match the expected schema.',
      first ? `${first.instancePath || '/'} ${first.message ?? ''}`.trim() : undefined,
    );
  }

  const servedByFallback = detectFallback(message);

  return {
    data: parsed,
    model: message.model,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
    servedByFallback,
  };
}

async function send(
  client: Anthropic,
  params: Record<string, unknown>,
  withFallback: boolean,
): Promise<Anthropic.Message> {
  // Casts through `unknown` because `output_config` and the beta `fallbacks`
  // parameter are newer than the SDK's published types.
  if (!withFallback) {
    const stream = client.messages.stream(params as unknown as Anthropic.MessageStreamParams);
    return await stream.finalMessage();
  }

  // `fallbacks` lives on the beta endpoint. Types lag the beta, hence the cast.
  const betaParams = {
    ...params,
    betas: [REFUSAL_FALLBACK_BETA],
    fallbacks: 'default',
  };
  const stream = (client.beta.messages as unknown as {
    stream: (p: unknown) => { finalMessage: () => Promise<Anthropic.Message> };
  }).stream(betaParams);
  return await stream.finalMessage();
}

/** A `fallback_message` iteration means another model served the answer. */
function detectFallback(message: Anthropic.Message): boolean {
  const iterations = (message.usage as { iterations?: Array<{ type?: string }> }).iterations;
  if (!Array.isArray(iterations)) return false;
  return iterations.some((entry) => entry?.type === 'fallback_message');
}

function isBadRequestAboutFallbacks(error: unknown): boolean {
  if (!(error instanceof Anthropic.APIError)) return false;
  if (error.status !== 400) return false;
  const text = String(error.message ?? '').toLowerCase();
  return text.includes('fallback') || text.includes('beta');
}

function toCoachingError(error: unknown): CoachingError {
  if (error instanceof CoachingError) return error;

  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 502;
    if (status === 401 || status === 403) {
      return new CoachingError(502, 'upstream_auth', 'The proxy could not authenticate with Anthropic.');
    }
    if (status === 429) {
      return new CoachingError(429, 'rate_limited', 'Rate limited upstream. Try again shortly.');
    }
    if (status >= 500) {
      return new CoachingError(503, 'upstream_unavailable', 'Anthropic is unavailable right now.');
    }
    return new CoachingError(502, 'upstream_error', 'Upstream request failed.', error.message);
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new CoachingError(504, 'timeout', 'The coaching request timed out.');
  }

  return new CoachingError(502, 'unknown', 'Unexpected error talking to Anthropic.');
}
