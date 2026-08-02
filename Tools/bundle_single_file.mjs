// Folds the built web app into one self-contained HTML fragment.
//
// Used for hosts that serve a single file with no side-loaded assets — the CSS
// and JS are inlined, and the wrapper tags are dropped because the host supplies
// its own document skeleton. The output is the same app, not a variant of it.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../web/dist/', import.meta.url).pathname
const assets = join(dist, 'assets')
const files = readdirSync(assets)
const cssName = files.find((name) => name.endsWith('.css'))
const jsName = files.find((name) => name.endsWith('.js'))
if (!cssName || !jsName) throw new Error('build output is missing its css or js')

const css = readFileSync(join(assets, cssName), 'utf8')
const js = readFileSync(join(assets, jsName), 'utf8')

// A literal </script> anywhere in a string would close the tag early.
const safeJs = js.replaceAll('</script', '<\\/script')

const out = `<title>SpeakLab</title>
<style>
${css}
</style>
<div id="root"></div>
<noscript>SpeakLab needs JavaScript: the whole app runs in your browser.</noscript>
<script type="module">
${safeJs}
</script>
`

const target = process.argv[2] ?? join(dist, 'speaklab-single-file.html')
writeFileSync(target, out)
console.log(`Wrote ${target} — ${(out.length / 1024).toFixed(0)} KB`)
