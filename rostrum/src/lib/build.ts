/**
 * Which build this is, and where it is served from.
 *
 * Both are inlined by Next at build time because of the NEXT_PUBLIC_ prefix,
 * which is safe here: neither is a secret. They exist so screens can state that
 * a static build has no server, and so files under public/ can be addressed
 * correctly when the app is served from a sub-path. Next rewrites its own asset
 * URLs for `basePath` but not ones we write ourselves, so anything pointing into
 * public/ has to go through `asset`.
 */
export const IS_STATIC_BUILD = process.env['NEXT_PUBLIC_ROSTRUM_STATIC'] === '1'

export const BASE_PATH = process.env['NEXT_PUBLIC_ROSTRUM_BASE_PATH'] ?? ''

/** A URL for a file in public/, correct in both builds. */
export function asset(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\/+/, '')}`
}
