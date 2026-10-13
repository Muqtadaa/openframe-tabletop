import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The accessibility floor must not know which world it protects.
 *
 * `design-tokens.test.ts` once held both the WCAG floors and the rules that made
 * the Notebook what it was, so replacing the world meant either keeping rules
 * nobody believed or deleting floors along with them. They are split now, and
 * this keeps them split: the generic files may not name the incumbent world's
 * vocabulary, so a rule that belongs to it cannot slip back in unnoticed.
 *
 * What counts is the vocabulary of the world's DECISIONS (its ruled ground, its
 * one red, its slips, its night theme) — not the `--of-*` token names, which
 * outlive the redesign.
 */
const GENERIC = [
  'a11y-floor.test.ts',
  'stylesheet-discipline.test.ts',
  'boot-splash.test.ts',
  'design-test-support.ts',
]

const INCUMBENT_VOCABULARY = /notebook|after[- ]hours|quadrille|one red|\bslips?\b|\bdesk\b/i

describe('the generic design tests', () => {
  it.each(GENERIC)('%s names nothing of the incumbent world', (file) => {
    const source = readFileSync(resolve(process.cwd(), 'src/app', file), 'utf8')
    const hits = source
      .split('\n')
      .map((line, index) => [index + 1, line] as const)
      .filter(([, line]) => INCUMBENT_VOCABULARY.test(line))
      .map(([index, line]) => `${file}:${String(index)}: ${line.trim()}`)
    expect(hits).toEqual([])
  })
})
