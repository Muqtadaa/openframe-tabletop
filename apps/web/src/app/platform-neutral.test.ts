import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The platform knows no game system.
 *
 * The first system Tabletop will bundle is based on the System Reference
 * Document 5.2.1, and a system supplies its own rules and content (PRODUCT.md,
 * principle 4). The platform (the document model, the room, the canvas, the
 * interface) must be able to host a second system, so no system's own
 * vocabulary may appear in it. That is a rule about names, because names are
 * how a platform quietly becomes one game: a `savingThrow` field in a generic
 * token looks harmless in a diff and is a second system's first blocker.
 *
 * This is the half of ADR T008 that a vocabulary can hold. The other half, that
 * platform packages cannot IMPORT a rules system, is a dependency-cruiser rule
 * that arrives with the first system package (Phase 3).
 *
 * Words that name only SOME systems are listed. Words every system shares
 * (initiative, hit points, a die, a roll) are the platform's to use and are not.
 * The terms are assembled from pieces so that this file is not itself a hit.
 */
const SYSTEM_TERMS = [
  ['armo', 'u?r class'],
  ['saving', '[ -]?throw'],
  ['spell', '[ -]?slot'],
  ['hit', '[ -]?di(?:ce|e)\\b'],
  ['proficiency', '[ -]?bonus'],
  ['dungeon', '[ -]?master'],
  ['dungeons', ' (?:&|and) dragons'],
  ['wizards', ' of the coast'],
  ['path', 'finder'],
  ['\\bd', '(?:nd|&d)\\b'],
  ['\\bs', 'rd\\b'],
  ['\\b5', 'e\\b'],
  ['fifth', '[ -]edition'],
].map((pieces) => new RegExp(pieces.join(''), 'i'))

const ROOT = resolve(process.cwd(), '../..')
const PLATFORM = ['packages/core/src', 'packages/collab/src', 'apps/rooms/src', 'apps/web/src']
const SKIPPED = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', '.wrangler'])
const SOURCE = /\.(ts|tsx|css|html)$/

function files(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (SKIPPED.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...files(path))
    else if (SOURCE.test(path)) out.push(path)
  }
  return out
}

describe('the platform is game-system neutral', () => {
  const sources = PLATFORM.flatMap((dir) => files(join(ROOT, dir))).filter(
    (path) => !path.endsWith('platform-neutral.test.ts'),
  )

  it('scans a real set of files', () => {
    expect(sources.length).toBeGreaterThan(500)
  })

  it('names no game system’s own vocabulary', () => {
    const hits: string[] = []
    for (const path of sources) {
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (SYSTEM_TERMS.some((term) => term.test(line))) {
            hits.push(`${relative(ROOT, path)}:${String(index + 1)} ${line.trim().slice(0, 80)}`)
          }
        })
    }
    expect(hits).toEqual([])
  })

  it('finds each of the terms in a sentence that uses it, so it is not vacuous', () => {
    const samples = [
      'a creature’s armour class',
      'make a saving throw',
      'a spell slot',
      'spend a hit die',
      'add the proficiency bonus',
      'the Dungeon Master',
      'Dungeons & Dragons',
      'Wizards of the Coast',
      'Pathfinder',
      'D&D',
      'the SRD',
      'a 5e monster',
      'fifth edition',
    ]
    const missed = samples.filter((sample) => !SYSTEM_TERMS.some((term) => term.test(sample)))
    expect(missed).toEqual([])
  })
})
