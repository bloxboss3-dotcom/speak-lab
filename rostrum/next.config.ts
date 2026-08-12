import type { NextConfig } from 'next'

/**
 * Two build modes, one codebase.
 *
 * The default is a server build: `/api/coach` holds the Anthropic key and a
 * model does the judging. That is the better app, and it needs somewhere to run.
 *
 * `ROSTRUM_STATIC=1` produces a folder of files instead, for GitHub Pages and
 * anything else that only serves static assets. There is no server in that mode,
 * so there is nowhere to keep a secret and no model coaching — the offline
 * evaluator handles every coaching path, which is why the app was built to work
 * without a key in the first place. The screen says which mode you are in.
 */

const isStatic = process.env['ROSTRUM_STATIC'] === '1'

// A project site is served from https://<user>.github.io/<repo>/, and Rostrum
// sits beneath the existing SpeakLab deployment rather than replacing it.
const basePath = process.env['ROSTRUM_BASE_PATH'] ?? ''

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStatic
    ? {
        output: 'export' as const,
        // Pages serves /x/ from /x/index.html, so emit directories.
        trailingSlash: true,
        images: { unoptimized: true },
        // Screens are .tsx and route handlers are .ts, so dropping .ts here
        // removes /api/coach from this build — a POST handler cannot be
        // exported, and there would be no server to hold its key anyway. Keep
        // that convention: a screen added as .ts would silently vanish from the
        // static site. `npm run check:static` fails the build if one appears.
        pageExtensions: ['tsx', 'jsx', 'js'],
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {}),
}

export default config
