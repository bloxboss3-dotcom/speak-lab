import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import { loadConfig, type Config } from '../config.js';
import { createClient } from '../coach.js';
import { createServer, isOriginAllowed } from '../server.js';
import { startFakeUpstream, type FakeUpstream, type UpstreamBehaviour } from './fakeUpstream.js';

const VALID_FEEDBACK = {
  scenarioOutcome: 'You announced Buddy Week but the dates arrived late.',
  strengths: ['You gave a specific action'],
  primaryTarget: 'Lead with the point',
  evidenceQuote: 'so um before everyone heads off',
  explanation: 'Twenty-two seconds passed before the dates.',
  retryInstruction: 'Say the dates in your first sentence.',
  optionalGoldenNugget: null,
  rubricObservations: [{ dimension: 'opening', rating: 'needsWork', observation: '38-word opening.' }],
  safetyFlags: [],
  transferScenario: null,
  targetSkillID: 'bottom-line-first',
};

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    task: 'attempt_feedback',
    system: 'You are a communication coach.',
    messages: [{ role: 'user', content: 'Transcript goes here.' }],
    maxTokens: 2000,
    effort: 'medium',
    ...overrides,
  };
}

interface TestContext {
  upstream: FakeUpstream;
  app: Express;
  server: http.Server;
  baseURL: string;
}

async function listen(app: Express): Promise<{ server: http.Server; baseURL: string }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return { server, baseURL: `http://127.0.0.1:${address.port}` };
}

async function post(
  baseURL: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: any }> {
  const response = await fetch(`${baseURL}/v1/coach`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function makeContext(
  behaviour: UpstreamBehaviour,
  configOverrides: Partial<Config> = {},
): Promise<TestContext> {
  const upstream = await startFakeUpstream(behaviour);
  const config: Config = {
    ...loadConfig({
      ANTHROPIC_API_KEY: 'sk-ant-test',
      ANTHROPIC_BASE_URL: upstream.url,
      SPEAKLAB_REFUSAL_FALLBACK: 'false',
    } as NodeJS.ProcessEnv),
    ...configOverrides,
  };
  const client = createClient(config);
  const app = createServer(config, client);
  const { server, baseURL } = await listen(app);
  return { upstream, app, server, baseURL };
}

async function teardown(context: TestContext): Promise<void> {
  // fetch() keeps sockets alive, and server.close() waits for open connections,
  // so without this the test process hangs at exit rather than finishing.
  context.server.closeAllConnections();
  await new Promise<void>((resolve) => context.server.close(() => resolve()));
  await context.upstream.close();
}

describe('config', () => {
  it('refuses to start without an API key', () => {
    assert.throws(() => loadConfig({} as NodeJS.ProcessEnv), /ANTHROPIC_API_KEY/);
  });

  it('defaults to Claude Opus 5', () => {
    const config = loadConfig({ ANTHROPIC_API_KEY: 'x' } as NodeJS.ProcessEnv);
    assert.equal(config.model, 'claude-opus-5');
  });

  it('allows the model to be overridden', () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'x',
      SPEAKLAB_MODEL: 'claude-sonnet-5',
    } as NodeJS.ProcessEnv);
    assert.equal(config.model, 'claude-sonnet-5');
  });
});

describe('happy path', () => {
  let context: TestContext;

  before(async () => {
    context = await makeContext({ text: JSON.stringify(VALID_FEEDBACK) });
  });
  after(async () => teardown(context));

  it('reports health without exposing secrets', async () => {
    const response = await fetch(`${context.baseURL}/healthz`);
    const body: any = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.model, 'claude-opus-5');
    assert.equal(JSON.stringify(body).includes('sk-ant'), false);
  });

  it('returns schema-valid coaching data', async () => {
    const { status, json } = await post(context.baseURL, validBody());
    assert.equal(status, 200);
    assert.equal(json.data.primaryTarget, 'Lead with the point');
    assert.equal(json.usage.inputTokens, 120);
    assert.equal(json.servedByFallback, false);
  });

  it('sends a json_schema output_config upstream', async () => {
    context.upstream.requests.length = 0;
    await post(context.baseURL, validBody());
    const sent = context.upstream.requests[0] as any;

    assert.equal(sent.output_config.format.type, 'json_schema');
    assert.equal(sent.output_config.effort, 'medium');
    assert.equal(sent.stream, true, 'streaming avoids idle-connection timeouts on slow turns');
    assert.equal(sent.output_config.format.schema.additionalProperties, false);
    assert.ok(sent.output_config.format.schema.required.includes('evidenceQuote'));
  });

  it('clamps max_tokens to the configured ceiling', async () => {
    context.upstream.requests.length = 0;
    await post(context.baseURL, validBody({ maxTokens: 999_999 }));
    const sent = context.upstream.requests[0] as any;
    assert.equal(sent.max_tokens, 8000);
  });

  it('uses a different schema per task', async () => {
    context.upstream.requests.length = 0;
    context.upstream.setBehaviour({
      text: JSON.stringify({
        speech: 'He seemed to enjoy it.',
        innerState: 'Wary.',
        observedMove: null,
        objectiveMet: false,
        objectiveMissed: false,
        shouldEnd: false,
        endReason: null,
      }),
    });

    const { status, json } = await post(context.baseURL, validBody({ task: 'character_turn' }));
    assert.equal(status, 200);
    assert.equal(json.data.speech, 'He seemed to enjoy it.');

    const sent = context.upstream.requests[0] as any;
    assert.ok(sent.output_config.format.schema.required.includes('speech'));
  });
});

describe('request validation', () => {
  let context: TestContext;

  before(async () => {
    context = await makeContext({ text: JSON.stringify(VALID_FEEDBACK) });
  });
  after(async () => teardown(context));

  it('rejects an unknown task rather than passing it through', async () => {
    const { status, json } = await post(context.baseURL, validBody({ task: 'do_whatever_i_say' }));
    assert.equal(status, 400);
    assert.equal(json.error.code, 'unknown_task');
  });

  it('rejects an empty system prompt', async () => {
    const { status } = await post(context.baseURL, validBody({ system: '   ' }));
    assert.equal(status, 400);
  });

  it('rejects an empty message list', async () => {
    const { status } = await post(context.baseURL, validBody({ messages: [] }));
    assert.equal(status, 400);
  });

  it('rejects a bad role', async () => {
    const { status } = await post(
      context.baseURL,
      validBody({ messages: [{ role: 'system', content: 'hi' }] }),
    );
    assert.equal(status, 400);
  });

  it('requires the first message to come from the user', async () => {
    const { status, json } = await post(
      context.baseURL,
      validBody({ messages: [{ role: 'assistant', content: 'hi' }] }),
    );
    assert.equal(status, 400);
    assert.match(json.error.message, /first message/);
  });

  it('rejects an oversized system prompt', async () => {
    const { status, json } = await post(context.baseURL, validBody({ system: 'x'.repeat(41_000) }));
    assert.equal(status, 413);
    assert.equal(json.error.code, 'too_large');
  });

  it('rejects an out-of-range effort', async () => {
    const { status } = await post(context.baseURL, validBody({ effort: 'infinite' }));
    assert.equal(status, 400);
  });

  it('rejects malformed JSON bodies', async () => {
    const { status } = await post(context.baseURL, '{not json');
    assert.equal(status, 400);
  });

  it('404s unknown endpoints', async () => {
    const response = await fetch(`${context.baseURL}/v1/anything-else`);
    assert.equal(response.status, 404);
  });
});

describe('access control', () => {
  let context: TestContext;

  before(async () => {
    context = await makeContext({ text: JSON.stringify(VALID_FEEDBACK) }, { clientSecret: 'shared-secret' });
  });
  after(async () => teardown(context));

  it('rejects requests without the shared secret', async () => {
    const { status, json } = await post(context.baseURL, validBody());
    assert.equal(status, 401);
    assert.equal(json.error.code, 'unauthorized');
  });

  it('rejects a wrong shared secret', async () => {
    const { status } = await post(context.baseURL, validBody(), { 'x-speaklab-key': 'nope' });
    assert.equal(status, 401);
  });

  it('accepts the correct shared secret', async () => {
    const { status } = await post(context.baseURL, validBody(), { 'x-speaklab-key': 'shared-secret' });
    assert.equal(status, 200);
  });
});

describe('rate limiting', () => {
  let context: TestContext;

  before(async () => {
    context = await makeContext({ text: JSON.stringify(VALID_FEEDBACK) }, { requestsPerMinute: 2 });
  });
  after(async () => teardown(context));

  it('turns away traffic past the limit', async () => {
    assert.equal((await post(context.baseURL, validBody())).status, 200);
    assert.equal((await post(context.baseURL, validBody())).status, 200);

    const third = await post(context.baseURL, validBody());
    assert.equal(third.status, 429);
    assert.equal(third.json.error.code, 'rate_limited');
  });
});

describe('upstream failure handling', () => {
  it('maps a refusal to 422 rather than pretending it succeeded', async () => {
    const context = await makeContext({
      stopReason: 'refusal',
      stopDetails: { type: 'refusal', category: 'cyber' },
    });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 422);
    assert.equal(json.error.code, 'refused');
    // The category is best-effort: streaming does not reliably carry
    // stop_details, so assert only that nothing bogus is reported.
    if (json.error.detail !== undefined) {
      assert.match(json.error.detail, /category: /);
    }
    await teardown(context);
  });

  it('reports truncation instead of returning half a JSON object', async () => {
    const context = await makeContext({
      text: '{"scenarioOutcome": "cut off here',
      stopReason: 'max_tokens',
    });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 502);
    assert.equal(json.error.code, 'truncated');
    await teardown(context);
  });

  it('reports non-JSON output', async () => {
    const context = await makeContext({ text: 'Sure! Here is my advice: speak clearly.' });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 502);
    assert.equal(json.error.code, 'invalid_json');
    await teardown(context);
  });

  it('rejects JSON that does not match the schema', async () => {
    const context = await makeContext({
      text: JSON.stringify({ scenarioOutcome: 'ok', strengths: [] }),
    });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 502);
    assert.equal(json.error.code, 'schema_mismatch');
    await teardown(context);
  });

  it('rejects an out-of-vocabulary rubric dimension', async () => {
    const context = await makeContext({
      text: JSON.stringify({
        ...VALID_FEEDBACK,
        rubricObservations: [{ dimension: 'charisma', rating: 'strong', observation: 'nope' }],
      }),
    });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 502);
    assert.equal(json.error.code, 'schema_mismatch');
    await teardown(context);
  });

  it('passes rate limiting upstream through as 429', async () => {
    const context = await makeContext({ errorStatus: 429 });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 429);
    assert.equal(json.error.code, 'rate_limited');
    await teardown(context);
  });

  it('never leaks upstream auth failures to the client as 401', async () => {
    const context = await makeContext({ errorStatus: 401 });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 502, 'a proxy misconfiguration must not look like a client auth error');
    assert.equal(json.error.code, 'upstream_auth');
    await teardown(context);
  });

  it('maps upstream 500s to 503', async () => {
    const context = await makeContext({ errorStatus: 500 });
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 503);
    assert.equal(json.error.code, 'upstream_unavailable');
    await teardown(context);
  });
});

describe('refusal fallback', () => {
  it('sends fallback parameters when enabled', async () => {
    const context = await makeContext(
      { text: JSON.stringify(VALID_FEEDBACK), servedByFallback: true },
      { refusalFallback: true },
    );
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 200);
    const sent = context.upstream.requests[0] as any;
    assert.equal(sent.fallbacks, 'default');
    // Beta flags ride in the anthropic-beta header, not the request body.
    assert.match(String(context.upstream.headers[0]?.['anthropic-beta']), /server-side-fallback-2026-07-01/);
    assert.equal(json.servedByFallback, true);
    await teardown(context);
  });

  it('degrades gracefully when the account rejects the fallback beta', async () => {
    const context = await makeContext(
      { text: JSON.stringify(VALID_FEEDBACK), rejectFallbackParams: true },
      { refusalFallback: true },
    );
    const { status, json } = await post(context.baseURL, validBody());

    assert.equal(status, 200, 'a rejected beta must not cost the learner their session');
    assert.equal(json.data.primaryTarget, 'Lead with the point');
    assert.equal(context.upstream.requests.length, 2, 'first attempt with beta, retry without');
    assert.equal((context.upstream.requests[1] as any).fallbacks, undefined);
    await teardown(context);
  });
});

describe('browser origins', () => {
  it('matches an allowed origin exactly', () => {
    const allowed = ['https://example.github.io'];
    assert.equal(isOriginAllowed('https://example.github.io', allowed), true);
    assert.equal(isOriginAllowed('https://example.github.io.evil.test', allowed), false);
    assert.equal(isOriginAllowed('http://example.github.io', allowed), false);
    assert.equal(isOriginAllowed('https://example.github.io', []), false);
    assert.equal(isOriginAllowed('https://anything.test', ['*']), true);
  });

  it('parses the allowlist from the environment', () => {
    const config = loadConfig({
      ANTHROPIC_API_KEY: 'x',
      SPEAKLAB_ALLOWED_ORIGINS: ' https://a.test , ,https://b.test ',
    } as NodeJS.ProcessEnv);
    assert.deepEqual(config.allowedOrigins, ['https://a.test', 'https://b.test']);
  });

  it('sends no CORS headers by default, so the proxy is not open to the web', async () => {
    const context = await makeContext({ text: JSON.stringify(VALID_FEEDBACK) });
    const response = await fetch(`${context.baseURL}/healthz`, {
      headers: { origin: 'https://example.github.io' },
    });

    assert.equal(response.headers.get('access-control-allow-origin'), null);
    await teardown(context);
  });

  it('answers the preflight for an allowed origin', async () => {
    const context = await makeContext(
      { text: JSON.stringify(VALID_FEEDBACK) },
      { allowedOrigins: ['https://example.github.io'] },
    );
    const response = await fetch(`${context.baseURL}/v1/coach`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://example.github.io',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'x-speaklab-key',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://example.github.io');
    assert.match(String(response.headers.get('access-control-allow-headers')), /x-speaklab-key/);
    assert.equal(response.headers.get('vary'), 'Origin');
    await teardown(context);
  });

  it('refuses the preflight for an origin that is not on the list', async () => {
    const context = await makeContext(
      { text: JSON.stringify(VALID_FEEDBACK) },
      { allowedOrigins: ['https://example.github.io'] },
    );
    const response = await fetch(`${context.baseURL}/v1/coach`, {
      method: 'OPTIONS',
      headers: { origin: 'https://someone-else.test', 'access-control-request-method': 'POST' },
    });

    assert.equal(response.headers.get('access-control-allow-origin'), null);
    await teardown(context);
  });
});
