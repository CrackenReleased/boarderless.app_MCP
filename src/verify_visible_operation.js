import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertVisibleBrowserMetadata } from './visible-browser-policy.js'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.rs', '.md', '.json', '.bat', '.sh', '.yml', '.yaml'])
const historical = new Set(['changelog.md', 'what_and_how_log.md'])
const self = 'src/verify_visible_operation.js'
const violations = []
const patterns = [
  [new RegExp(`head${'less'}\\s*:\\s*(?:true|['\"]new['\"])`, 'i'), 'headless browser launch configuration'],
  [new RegExp(`--head${'less'}(?:=|\\b)`, 'i'), 'headless browser command-line flag'],
  [new RegExp(`BOARDERLESS_MCP_HEAD${'LESS'}`, 'i'), 'headless MCP environment override'],
  [/\b(?:chromium|firefox|webkit)\.launch\s*\(\s*\)/, 'Playwright launch defaults to headless'],
]

assertVisibleBrowserMetadata({ product: 'Chrome/150.0', userAgent: 'Chrome/150.0', outerWidth: 1280, outerHeight: 720, visibilityState: 'visible' })
for (const identity of ['HeadlessChrome/150.0', 'Mozilla/5.0 HeadlessChromium/150.0']) {
  let rejected = false
  try {
    assertVisibleBrowserMetadata({ product: identity, userAgent: identity, outerWidth: 1280, outerHeight: 720, visibilityState: 'visible' })
  } catch (error) {
    rejected = error?.code === 'HEADLESS_BROWSER_REJECTED'
  }
  if (!rejected) violations.push(`visible-browser-policy.js: failed to reject ${identity}`)
}

for (const relativePath of tracked) {
  if (relativePath === self || historical.has(relativePath) || relativePath.endsWith('package-lock.json')) continue
  if (!extensions.has(extname(relativePath).toLowerCase())) continue
  const source = readFileSync(resolve(root, relativePath), 'utf8')
  for (const [pattern, label] of patterns) {
    if (pattern.test(source)) violations.push(`${relativePath}: ${label}`)
  }
}

const server = readFileSync(resolve(root, 'src/mcp-stdio-server.js'), 'utf8')
for (const required of ['assertVisibleBoarderlessPage']) {
  if (!server.includes(required)) violations.push(`src/mcp-stdio-server.js: missing runtime visibility guard ${required}`)
}
const runtimePolicy = readFileSync(resolve(root, 'src/visible-browser-policy.js'), 'utf8')
for (const required of ['bringToFront', 'HEADLESS_BROWSER_REJECTED', 'INVISIBLE_BROWSER_REJECTED']) {
  if (!runtimePolicy.includes(required)) violations.push(`src/visible-browser-policy.js: missing runtime enforcement ${required}`)
}

if (violations.length > 0) {
  console.error('Boarderless MCP visible-operation policy failed:')
  for (const violation of violations) console.error(` - ${violation}`)
  process.exit(1)
}

console.log(`Boarderless MCP visible-operation policy passed across ${tracked.length} tracked files.`)
