/**
 * Which build this is.
 *
 * Inlined by Next at build time because of the NEXT_PUBLIC_ prefix, which is
 * safe here: it is a boolean about the deployment, not a secret. It exists so
 * screens can state plainly that a static build has no server rather than
 * describing a coaching path that cannot exist.
 */
export const IS_STATIC_BUILD = process.env['NEXT_PUBLIC_ROSTRUM_STATIC'] === '1'
