/**
 * filmroom-auth-next-test.cjs
 *
 * Unit tests for safeFilmroomNext helper covering:
 *   - Family deep link preservation
 *   - Game deep link preservation
 *   - Unsafe URL rejection (open redirect, control chars, protocol)
 *   - Null/empty/missing → /filmroom
 *   - Does not send any emails
 */

'use strict'

let failures = 0
function assert(v, msg) { if (!v) throw new Error(msg) }
async function test(name, fn) {
  try { await fn(); console.log('PASS', name) }
  catch (e) { failures++; console.log('FAIL', name, e.message) }
}

import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const exports = {}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/filmroom-auth-next.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL})
const {safeFilmroomNext}=exports

// ── Safe paths that must be preserved ────────────────────────────────────────
await test('family deep link preserved', async () => {
  assert(safeFilmroomNext('/filmroom/family') === '/filmroom/family')
})

await test('game deep link preserved', async () => {
  const url = '/filmroom/game/33333333-3333-4333-8333-333333333333'
  assert(safeFilmroomNext(url) === url)
})

await test('/filmroom root preserved', async () => {
  assert(safeFilmroomNext('/filmroom') === '/filmroom')
})

await test('settings deep link preserved', async () => {
  assert(safeFilmroomNext('/filmroom/settings') === '/filmroom/settings')
})

// ── Unsafe URLs that must redirect to /filmroom ───────────────────────────────
await test('null returns /filmroom', async () => {
  assert(safeFilmroomNext(null) === '/filmroom')
})

await test('empty string returns /filmroom', async () => {
  assert(safeFilmroomNext('') === '/filmroom')
})

await test('absolute URL with protocol rejected', async () => {
  assert(safeFilmroomNext('https://evil.example.com') === '/filmroom')
})

await test('protocol-relative // URL rejected', async () => {
  assert(safeFilmroomNext('//evil.example.com') === '/filmroom')
})

await test('non-filmroom path rejected', async () => {
  assert(safeFilmroomNext('/admin') === '/filmroom')
})

await test('backslash rejected (backslash path traversal)', async () => {
  assert(safeFilmroomNext('/filmroom\\evil') === '/filmroom')
})

await test('control char in path rejected', async () => {
  assert(safeFilmroomNext('/filmroom/\x01evil') === '/filmroom')
})

await test('javascript: protocol rejected', async () => {
  assert(safeFilmroomNext('javascript:alert(1)') === '/filmroom')
})

await test('data: URI rejected', async () => {
  assert(safeFilmroomNext('data:text/html,<script>alert(1)</script>') === '/filmroom')
})

await test('path with colon (looks like protocol) rejected', async () => {
  // e.g. /filmroom/game:exploit — colon present → rejected
  assert(safeFilmroomNext('/filmroom/game:exploit') === '/filmroom')
})

// ── No emails sent (verify no side effects in this module) ────────────────────
await test('safeFilmroomNext has no side effects (no email/network)', async () => {
  // This is a pure function — calling it produces no observable side effects.
  // If it had called a network function, this test environment would throw.
  const result = safeFilmroomNext('/filmroom/family')
  assert(result === '/filmroom/family', 'pure function returned wrong value')
})

for (const unsafe of ['/filmroom/../admin', '/filmroom/%2e%2e/admin', '/filmroom/../../admin']) {
 await test('normalised escape rejected: '+unsafe, async () => assert(safeFilmroomNext(unsafe)==='/filmroom'))
}
await test('deep link query and hash preserved', async () => assert(safeFilmroomNext('/filmroom/family?game=example#clips')==='/filmroom/family?game=example#clips'))

console.log(JSON.stringify({ failures }))
process.exitCode = failures ? 1 : 0
