# SpeakLab proxy

A small server that holds your Anthropic API key so the iOS app never has to.

The app builds every prompt itself and asks for a **named task**; the proxy
picks the matching JSON schema, calls Claude, validates the response, and
returns it. A client cannot ask for an arbitrary response shape, and the key
never leaves this process.

```
iOS app ──POST /v1/coach──▶ proxy ──▶ Anthropic API
   (no key)                (key here)
```

## Run it locally

```bash
cd server
npm install
cp .env.example .env        # then edit .env
npm run build && npm start
```

Check it:

```bash
curl localhost:8787/healthz
```

Point the app at `http://<your-mac-lan-ip>:8787` in Settings → AI coaching.
`localhost` will not work from a physical iPhone — it needs your Mac's LAN
address (`ipconfig getifaddr en0`), and both devices on the same Wi-Fi.

## Deploy it

Any Node host works. The `Dockerfile` builds a container that listens on
`$PORT`, which is what Fly.io, Render, Railway and Cloud Run all expect.

```bash
# Fly.io
fly launch --no-deploy
fly secrets set ANTHROPIC_API_KEY=sk-ant-... SPEAKLAB_CLIENT_SECRET=$(openssl rand -hex 32)
fly deploy
```

**Set `SPEAKLAB_CLIENT_SECRET` before exposing this publicly.** Without it,
anyone who discovers the URL can spend your API credits. With it, requests must
carry the same value in an `x-speaklab-key` header, which the app sends for you.

## API

### `POST /v1/coach`

```jsonc
{
  "task": "attempt_feedback",     // or attempt_comparison | character_turn | conversation_debrief
  "system": "…",                  // built by the app
  "messages": [{ "role": "user", "content": "…" }],
  "maxTokens": 4000,              // clamped to SPEAKLAB_MAX_TOKENS_CEILING
  "effort": "medium"              // low | medium | high | xhigh | max
}
```

Success:

```jsonc
{
  "data": { /* validated against the task's schema */ },
  "model": "claude-opus-5",
  "usage": { "inputTokens": 2100, "outputTokens": 480 },
  "servedByFallback": false
}
```

Errors are always `{ "error": { "code", "message", "detail? } }`:

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `unknown_task`, `bad_request`, `bad_json` | The app sent something invalid |
| 401 | `unauthorized` | Missing or wrong `x-speaklab-key` |
| 413 | `too_large` | Prompt or conversation exceeded limits |
| 422 | `refused` | Claude's safety classifiers declined the request |
| 429 | `rate_limited` | Local limiter or upstream rate limit |
| 502 | `invalid_json`, `schema_mismatch`, `truncated`, `upstream_auth` | The model or the upstream misbehaved |
| 503 | `upstream_unavailable` | Anthropic is down |
| 504 | `timeout` | The request took too long |

The app treats every one of these as recoverable: it falls back to on-device
feedback and tells the learner what happened.

### `GET /healthz`

Returns the model in use and whether a client secret is required. Contains no
secrets.

## Configuration

See `.env.example`. The two that matter:

- **`SPEAKLAB_MODEL`** — `claude-opus-5` by default, which gives the best
  coaching judgement. `claude-sonnet-5` is meaningfully faster and cheaper if
  you would rather trade some quality for latency on every attempt.
- **`SPEAKLAB_REFUSAL_FALLBACK`** — on by default. Claude Opus 5's safety
  classifiers can decline a request outright; with this on, the API re-runs it
  on a fallback model within the same call instead of returning a refusal.
  Difficult-conversation practice occasionally trips a classifier, so this is
  worth keeping. If your account rejects the beta parameter, the proxy notices
  the 400, logs a warning, and retries without it rather than failing the
  learner's session.

## Implementation notes

- **Streaming, then one JSON response.** The proxy streams from Anthropic and
  returns the assembled object. Streaming is what stops a slow high-effort turn
  from dying on an idle-connection timeout; the app doesn't have to care.
- **Two layers of validation.** Structured outputs constrain the shape at the
  API, and Ajv re-checks it here. The Swift decoder checks a third time. Schema
  drift shows up as a clean error instead of a half-empty feedback card.
- **Thinking blocks are skipped.** Claude Opus 5 thinks by default, so the
  response text is not `content[0]` — the proxy finds the first text block.
- **The rate limiter is in-memory** and per-process. Fine for one user; put a
  real limiter in front if this ever serves more.

## Tests

```bash
npm test
```

31 tests run against a stub Anthropic upstream that speaks SSE — no API key and
no network needed. They cover request validation, auth, rate limiting, schema
enforcement, refusal handling, truncation, upstream error mapping, and the
fallback-degradation path.
