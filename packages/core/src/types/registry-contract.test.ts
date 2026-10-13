import { describe, expect, it } from 'vitest'

import { asObjectId, asOrderKey } from '../domain/ids.js'
import type { AnyOpenFrameObject } from '../domain/object.js'
import { COLOR_TOKENS, STYLE_PROPS } from '../domain/object.js'
import { createFixtureRegistry } from '../testing-fixtures.js'
import { createDefaultRegistry } from './index.js'

/**
 * The contract every object type must satisfy, checked for all of them at once.
 *
 * This is the test that makes adding a semantic type safe: a new `evidence`
 * type is covered by these guarantees the moment it is registered, with no new
 * test file required for the basics. If one of these fails, the type would
 * break search, AI serialization, migration or persistence — all of which
 * consume the registry generically.
 */
describe('object type registry contract', () => {
  const registry = createDefaultRegistry()
  const definitions = registry.list()
  // The test-only types that exercise promotion, derivation and record fields.
  const fixtures = createFixtureRegistry()
  const everything = [...definitions, ...fixtures.list()]

  it('registers exactly the expected set', () => {
    // Asserted explicitly rather than loosely: a type appearing or vanishing
    // unnoticed is how the app and the persisted format quietly diverge.
    expect(definitions.map((d) => d.type).sort()).toEqual([
      'code',
      'connector',
      'frame',
      'group',
      'image',
      'poll',
      'poll-answer',
      'reaction',
      'relation',
      'shape',
      'sticky',
      'table',
      'text',
      'unknown',
    ])
  })

  /**
   * The check that makes the two field tests below non-vacuous.
   *
   * `defineObjectType` copies optional members one by one, and both sides
   * declare them optional — so forgetting one type checks cleanly and erases it
   * to `undefined`. That happened to `fields` on the day it was added, and the
   * per-type tests that police field declarations silently passed on an empty
   * set. A test that passes vacuously is worse than no test, because it is
   * trusted (rule 23), so this asserts a known declaration survives erasure.
   */
  it("carries a type's field declarations through erasure", () => {
    const source = fixtures.get('fixture-source')
    expect(source?.fields?.map((f) => f.key)).toEqual(['source', 'participant', 'tags'])
    // Same trap, same guard: every optional member is copied one at a time in
    // `defineObjectType`, and forgetting one type checks perfectly.
    expect(fixtures.get('sticky')?.promotions).toEqual(['fixture-source', 'fixture-claim'])
    expect(fixtures.get('fixture-source')?.derivations).toEqual([
      { type: 'fixture-claim', predicate: 'cites' },
    ])
    // The product itself declares neither for a sticky note: the research types
    // that used them are not shipped, and an empty menu is the honest answer.
    expect(registry.get('sticky')?.promotions).toBeUndefined()
    expect(registry.get('sticky')?.derivations).toBeUndefined()
    // A copy that lost these would paste lines attached to nothing and
    // pictures without their bytes, and every paste test would still pass on
    // the types that declare neither.
    expect(registry.get('connector')?.copyReferences).toBeTypeOf('function')
    expect(registry.get('relation')?.copyReferences).toBeTypeOf('function')
    expect(registry.get('image')?.copyReferences).toBeTypeOf('function')
    expect(registry.get('image')?.assets).toBeTypeOf('function')
  })

  /**
   * A promotion offered to a type that does not exist is a menu entry that
   * throws when clicked, and one to a non-spatial type is an entry the command
   * layer will always refuse — an affordance for something impossible.
   */
  /**
   * A derivation to a type that does not exist is a menu entry that throws, and
   * one to a type with no place on the board is an object nobody could ever
   * find. The predicate must say something: an empty one is a relation that
   * means nothing, which is worse than no relation.
   */
  it('derives only to types that exist, with a predicate that says something', () => {
    for (const definition of everything) {
      for (const derivation of definition.derivations ?? []) {
        const destination = fixtures.get(derivation.type)
        expect(
          destination,
          `${definition.type} derives to unregistered "${derivation.type}"`,
        ).toBeDefined()
        expect(destination?.capabilities.spatial).toBe(true)
        expect(derivation.predicate.trim().length).toBeGreaterThan(0)
      }
    }
  })

  /**
   * A chain of derivations asserted as a path rather than as separate
   * declarations. It used to be the research product's synthesis spine; the
   * fixtures keep the same shape, so a dropped link still shows here.
   */
  it('connects a chain of derivations', () => {
    const spine = ['fixture-source', 'fixture-claim', 'fixture-followup']
    for (const [index, from] of spine.slice(0, -1).entries()) {
      const next = spine[index + 1]
      const offered = fixtures.get(from)?.derivations?.map((d) => d.type) ?? []
      expect(offered, `${from} cannot derive a ${String(next)}`).toContain(next)
    }
  })

  it('offers promotions only to types that exist and can be on the board', () => {
    for (const definition of everything) {
      for (const target of definition.promotions ?? []) {
        const destination = fixtures.get(target)
        expect(destination, `${definition.type} promotes to unregistered "${target}"`).toBeDefined()
        expect(destination?.capabilities.spatial).toBe(true)
      }
    }
  })

  /*
   * Content pasted from outside the board becomes one type's object: two types
   * answering would make which one depend on registration order.
   */
  it('has exactly one home for pasted words, a pasted grid and a pasted note', () => {
    const homes = (kind: 'text' | 'grid' | 'note') =>
      definitions.filter((d) => d.fromOutside?.[kind] !== undefined).map((d) => d.type)
    expect(homes('text')).toEqual(['text'])
    expect(homes('grid')).toEqual(['table'])
    expect(homes('note')).toEqual(['sticky'])
    expect(
      definitions
        .filter((d) => d.appendText !== undefined)
        .map((d) => d.type)
        .sort(),
    ).toEqual(['shape', 'sticky', 'text'])
  })

  // Every object pasted from outside must be one its own schema accepts.
  it('makes pasted content into data its type accepts', () => {
    const words = registry.fromOutside({ text: [{ text: 'Pricing\nis hidden' }] })
    const grid = registry.fromOutside({
      grid: [[[{ text: 'a' }], [{ text: 'b' }]], [[{ text: 'c' }]]],
    })
    const note = registry.fromOutside({ note: [{ text: 'Price is hidden' }] })
    for (const made of [words, grid, note]) {
      if (made === null) throw new Error('expected a home')
      const definition = registry.require(made.type)
      expect(definition.validate(definition.create(made.data).data).ok).toBe(true)
    }
  })

  it('rejects duplicate registration', () => {
    const duplicate = definitions[0]
    expect(duplicate).toBeDefined()
    if (duplicate === undefined) return
    expect(() => registry.register(duplicate)).toThrow(/already registered/)
  })

  for (const definition of createDefaultRegistry().list()) {
    describe(definition.type, () => {
      it('has a positive current version', () => {
        expect(definition.currentVersion).toBeGreaterThan(0)
      })

      it('creates data that satisfies its own schema', () => {
        const { data } = definition.create()
        expect(definition.validate(data).ok).toBe(true)
      })

      /**
       * A type that occupies the board must be findable on it: either it has a
       * positive default size, or it computes its own bounds. A connector has no
       * meaningful frame — its extent is wherever its endpoints resolve — so it
       * supplies `getBounds` instead. A SPATIAL type with neither would be
       * invisible and unclickable.
       *
       * A relation is not on the board at all, so it is exempt — and the
       * exemption is spelled as `spatial: false` rather than by naming the type,
       * which is also what keeps it out of culling and marquee selection.
       */
      it('is either sized, self-bounding, or not on the board', () => {
        if (!definition.capabilities.spatial) {
          const { frame } = definition.create()
          // A non-spatial type must not pretend to have an extent.
          expect(frame.width === 0 && frame.height === 0).toBe(true)
          expect(definition.getBounds).toBeUndefined()
          return
        }
        const { frame } = definition.create()
        const sized = frame.width > 0 && frame.height > 0
        expect(sized || definition.getBounds !== undefined).toBe(true)
      })

      it('has a migration for every version below the current one', () => {
        const { data } = definition.create()
        for (let from = 1; from <= definition.currentVersion; from++) {
          expect(() => definition.migrate(data, from)).not.toThrow()
        }
      })

      it('refuses data from a newer version than it understands', () => {
        const { data } = definition.create()
        expect(() => definition.migrate(data, definition.currentVersion + 1)).toThrow()
      })

      it('rejects invalid data rather than accepting it', () => {
        expect(definition.validate({ __definitely: 'not valid' }).ok).toBe(false)
      })

      /**
       * Read from `STYLE_PROPS`, never restated here. A list written out in a
       * test is a second copy of the thing under test, and it passes against
       * whatever the app looked like the day it was written — this one did
       * exactly that, and failed the moment a corner radius was added.
       */
      it('declares only real style properties', () => {
        const allowed = new Set<string>(STYLE_PROPS)
        for (const prop of definition.capabilities.styleProps) {
          expect(allowed.has(prop), `${definition.type} declares an unknown "${prop}"`).toBe(true)
        }
      })

      /**
       * The guard that makes a field declaration falsifiable.
       *
       * `sticky` once declared a `fill` its view ignored, and nothing failed
       * because nothing consumed the declaration (rule 21). A declared FIELD
       * fails worse: the inspector renders a control, the user types into it,
       * and the write is rejected at the boundary — an edit that silently does
       * not save. So each declared key is round-tripped through the type's own
       * schema here, which is the same check `UpdateObjectData` will apply.
       */
      it('declares only fields its own schema accepts', () => {
        const sample: Record<string, unknown> = {
          text: 'sample',
          longText: 'sample',
          tags: ['sample'],
          select: undefined,
          boolean: true,
          choices: [
            { id: 'o1', label: 'Sample' },
            { id: 'o2', label: 'Other' },
          ],
        }
        for (const field of definition.fields ?? []) {
          const { data } = definition.create()
          expect(typeof data).toBe('object')

          if (field.kind === 'select') {
            // A select with no options is a control with nothing to pick.
            expect(field.options?.length ?? 0).toBeGreaterThan(0)
            for (const option of field.options ?? []) {
              const result = definition.validate({ ...(data as object), [field.key]: option })
              expect(result.ok, `${definition.type}.${field.key} rejects option ${option}`).toBe(
                true,
              )
            }
            continue
          }

          const result = definition.validate({
            ...(data as object),
            [field.key]: sample[field.kind],
          })
          expect(result.ok, `${definition.type}.${field.key} is not in its own schema`).toBe(true)
        }
      })

      /**
       * A field the type declares but never reports is invisible to search, AI
       * context and export — the three consumers of `describe` — so the panel
       * would be the only place it existed.
       */
      it('reports every declared field in its description', () => {
        if (definition.fields === undefined) return
        const { data, frame } = definition.create()
        const described = definition.describe({
          id: asObjectId('obj_1'),
          type: definition.type,
          dataVersion: definition.currentVersion,
          frame: { x: 0, y: 0, ...frame, rotation: 0 },
          parentId: null,
          order: asOrderKey('a0'),
          style: { color: COLOR_TOKENS[0] },
          locked: false,
          hidden: false,
          data,
          meta: { createdAt: 0, createdBy: null, createdVia: 'user' },
        })
        for (const field of definition.fields) {
          expect(
            Object.hasOwn(described.fields, field.key),
            `${definition.type}.${field.key} is editable but never described`,
          ).toBe(true)
        }
      })

      it('describes an instance without throwing', () => {
        const { data, frame } = definition.create()
        const object: AnyOpenFrameObject = {
          id: asObjectId('obj_1'),
          type: definition.type,
          dataVersion: definition.currentVersion,
          frame: { x: 0, y: 0, ...frame, rotation: 0 },
          parentId: null,
          order: asOrderKey('a0'),
          style: { color: COLOR_TOKENS[0] },
          locked: false,
          hidden: false,
          data,
          meta: { createdAt: 0, createdBy: null, createdVia: 'user' },
        }
        const description = definition.describe(object)
        expect(typeof description.searchText).toBe('string')
        expect(description.summary.length).toBeGreaterThan(0)
        expect(typeof description.fields).toBe('object')
      })

      /*
       * The gist is what the record panel prints UNDER the type's name, so a
       * type label in it is printed twice — "Frame" over "Frame: Frame" — and
       * a placeholder like "Empty sticky note" speaks for content that is not
       * there. Asked of a fresh instance, because that is when a type is most
       * tempted to fill the line with something about itself.
       */
      it('gives a gist that says what it holds, not what it is', () => {
        const { data, frame } = definition.create()
        const { gist } = definition.describe({
          id: asObjectId('obj_1'),
          type: definition.type,
          dataVersion: definition.currentVersion,
          frame: { x: 0, y: 0, ...frame, rotation: 0 },
          parentId: null,
          order: asOrderKey('a0'),
          style: { color: COLOR_TOKENS[0] },
          locked: false,
          hidden: false,
          data,
          meta: { createdAt: 0, createdBy: null, createdVia: 'user' },
        })
        expect(gist).not.toMatch(/^[\w -]+: /)
        expect(gist).not.toMatch(/^empty\b/i)
      })
    })
  }
})
