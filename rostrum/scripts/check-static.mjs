import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards the one sharp edge in the static build.
 *
 * The static export drops the `ts` page extension, which is how `/api/coach`
 * is left out of a build that has no server to hold its key. The cost of that
 * trick is a convention: anything routable written as `.ts` disappears from the
 * static site silently, with a green build and a missing page.
 *
 * So this fails loudly instead. Screens are `.tsx`; only route handlers may be
 * `.ts`, and they are server-only by definition.
 */

const APP = new URL('../src/app', import.meta.url).pathname
const ROUTABLE = new Set(['page', 'layout', 'template', 'default', 'not-found', 'error', 'loading'])

const offenders = []

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!entry.endsWith('.ts') || entry.endsWith('.d.ts')) continue
    const stem = entry.slice(0, -3)
    if (ROUTABLE.has(stem)) offenders.push(path)
  }
}

walk(APP)

if (offenders.length > 0) {
  console.error(
    'These are routable files written as .ts, so the static export would drop them:\n' +
      offenders.map((path) => `  ${path}`).join('\n') +
      '\n\nRename each to .tsx. Only route handlers (route.ts) may be .ts — they are\n' +
      'server-only, and leaving them out of the static build is the point.',
  )
  process.exit(1)
}
