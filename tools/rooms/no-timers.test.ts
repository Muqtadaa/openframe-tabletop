/**
 * The room server keeps no timer (rule 29).
 *
 * A pending `setTimeout` or `setInterval` keeps a Durable Object in memory, and
 * an object in memory is billed for every second it stays. The y-protocols
 * awareness the room once held ran one every three seconds and spent most of a
 * day's allowance by evening. Work that has to happen later is an alarm, and
 * the limits in `limits.ts` are worked out from the clock when something
 * happens, never by something waking to reset them.
 *
 * Read from the source rather than run, because a Durable Object cannot be run
 * in Node and a guard that needs a deploy is one nobody runs. Lives here
 * rather than beside the code because the Worker's own tsconfig is the
 * Workers runtime's and has no `node:fs`.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const SRC = join(import.meta.dirname, '../../apps/rooms/src')
const TIMER = /\bset(Timeout|Interval)\s*\(/

const SOURCES = readdirSync(SRC).filter(
  (name) => name.endsWith('.ts') && !name.endsWith('.test.ts') && name !== 'testing.ts',
)

/** The code, with comments taken out, so prose about timers is not mistaken for one. */
function code(name: string): string {
  return readFileSync(join(SRC, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

void describe('the room server', () => {
  void it('has sources to read', () => {
    assert.ok(SOURCES.includes('room-object.ts'))
    assert.ok(SOURCES.includes('limits.ts'))
  })

  for (const name of SOURCES) {
    void it(`${name} starts no timer`, () => {
      assert.doesNotMatch(code(name), TIMER)
    })
  }

  void it('would notice one, if there were one', () => {
    assert.match('const stay = setInterval(() => undefined, 3000)', TIMER)
  })
})
