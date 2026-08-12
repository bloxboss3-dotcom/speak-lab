import { NextResponse } from 'next/server'

/**
 * The only place the API key exists.
 *
 * The browser never sees it and never can: this route runs on the server, reads
 * the key from the environment, and returns only the model's text. If no key is
 * configured the route says so in a structured way and the client falls back to
 * its offline evaluator, which is a real analysis rather than a placeholder —
 * so the app is fully usable either way.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

/**
 * Sonnet by default. This route sits inside an interactive loop — speak, wait,
 * read, immediately retry — where latency is a feature of the product rather
 * than a detail. Set ROSTRUM_MODEL to claude-opus-5 for deeper judgement at the
 * cost of a noticeably longer wait on every attempt.
 */
const DEFAULT_MODEL = 'claude-sonnet-5'

const MAX_SYSTEM_CHARS = 20_000
const MAX_USER_CHARS = 20_000

interface CoachRequestBody {
  system?: unknown
  user?: unknown
  maxTokens?: unknown
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: { code: 'bad_request', message } }, { status })
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Not an error the learner needs to see as a failure — it is the app's
    // documented offline mode.
    return NextResponse.json(
      { error: { code: 'not_configured', message: 'No ANTHROPIC_API_KEY is set.' } },
      { status: 503 },
    )
  }

  let body: CoachRequestBody
  try {
    body = (await request.json()) as CoachRequestBody
  } catch {
    return bad('Body was not valid JSON.')
  }

  const system = typeof body.system === 'string' ? body.system : ''
  const user = typeof body.user === 'string' ? body.user : ''
  if (!system.trim() || !user.trim()) return bad('system and user are both required.')
  if (system.length > MAX_SYSTEM_CHARS || user.length > MAX_USER_CHARS) {
    return bad('Prompt is too long.', 413)
  }

  const maxTokens =
    typeof body.maxTokens === 'number' && Number.isFinite(body.maxTokens)
      ? Math.max(256, Math.min(4000, Math.floor(body.maxTokens)))
      : 1400

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: process.env.ROSTRUM_MODEL ?? DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      // Upstream auth problems are the operator's, never the learner's — do not
      // return 401 to the browser and make it look like they are signed out.
      const status = response.status === 401 || response.status === 403 ? 502 : response.status
      console.error('[coach] upstream error', response.status, detail.slice(0, 400))
      return NextResponse.json(
        { error: { code: 'upstream', message: 'The coaching service could not be reached.' } },
        { status },
      )
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
      stop_reason?: string
    }

    if (payload.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: { code: 'refused', message: 'The coach declined to analyse this one.' } },
        { status: 422 },
      )
    }

    // Thinking blocks may precede the answer, so take the first text block
    // rather than assuming content[0].
    const text = payload.content?.find((block) => block.type === 'text')?.text
    if (!text) {
      return NextResponse.json(
        { error: { code: 'empty', message: 'The coaching service returned no text.' } },
        { status: 502 },
      )
    }

    return NextResponse.json({ text })
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    console.error('[coach] request failed', error)
    return NextResponse.json(
      {
        error: {
          code: aborted ? 'timeout' : 'network',
          message: aborted ? 'The coaching service timed out.' : 'The coaching service failed.',
        },
      },
      { status: 504 },
    )
  } finally {
    clearTimeout(timeout)
  }
}
