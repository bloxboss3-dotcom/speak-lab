/** Runtime configuration, all from the environment. Nothing secret is ever logged. */
export interface Config {
  port: number;
  apiKey: string;
  /** Anthropic model id. Opus 5 by default; see README for the trade-off. */
  model: string;
  baseURL?: string;
  /**
   * Optional shared secret. When set, requests must carry it in
   * `x-speaklab-key`. Strongly recommended for anything reachable publicly —
   * otherwise the deployment is an open, billable endpoint.
   */
  clientSecret?: string;
  /** Hard ceiling on max_tokens regardless of what a client asks for. */
  maxTokensCeiling: number;
  requestsPerMinute: number;
  /**
   * Server-side refusal fallback. Claude Opus 5's safety classifiers can
   * decline a request outright; with this on, the API re-runs it on a fallback
   * model in the same call instead of returning a refusal.
   */
  refusalFallback: boolean;
  requestTimeoutMs: number;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in, or export the variable.',
    );
  }

  return {
    port: intFromEnv('PORT', 8787),
    apiKey,
    model: env.SPEAKLAB_MODEL ?? 'claude-opus-5',
    baseURL: env.ANTHROPIC_BASE_URL,
    clientSecret: env.SPEAKLAB_CLIENT_SECRET || undefined,
    maxTokensCeiling: intFromEnv('SPEAKLAB_MAX_TOKENS_CEILING', 8000),
    requestsPerMinute: intFromEnv('SPEAKLAB_RPM', 40),
    refusalFallback: boolFromEnv('SPEAKLAB_REFUSAL_FALLBACK', true),
    requestTimeoutMs: intFromEnv('SPEAKLAB_TIMEOUT_MS', 120_000),
  };
}
