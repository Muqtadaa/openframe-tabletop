import { type ZodType, z } from 'zod'

import { plainTextOf, RichTextSchema, type RichText } from './domain/rich-text.js'
import { defineObjectType, ObjectTypeRegistry } from './domain/registry.js'
import { createDefaultRegistry } from './types/index.js'
import { pollType } from './types/poll/definition.js'
import { pollAnswerType } from './types/poll-answer/definition.js'
import { reactionType } from './types/reaction/definition.js'
import { stickyType } from './types/sticky/definition.js'

/**
 * Three object types that exist only for tests.
 *
 * The registry's relation, mark and derivation machinery, promotion between
 * types, record fields and search by field are all generic, and all need a type
 * that uses them to be tested. Their first users were the research types
 * (evidence, insight, hypothesis, and the rest), which Tabletop does not ship.
 * Rather than lose the protection, these carry it: the same shapes, with names
 * that say what they are.
 *
 *   fixture-source    a quoted record with fields and tags (was `evidence`)
 *   fixture-claim     a statement standing on sources, with a select field
 *                     (was `insight`)
 *   fixture-followup  a statement a claim leads to (was `hypothesis`)
 *
 * They are never in `createDefaultRegistry()`, so nothing ships them. A test
 * gets them through `createFixtureRegistry()` or `createFixtureHarness()`.
 */

export const FIXTURE_SOURCE = 'fixture-source'
export const FIXTURE_CLAIM = 'fixture-claim'
export const FIXTURE_FOLLOWUP = 'fixture-followup'

interface SourceData {
  readonly text: RichText
  readonly source: string
  readonly participant: string
  readonly tags: readonly string[]
}

const SourceSchema: ZodType<SourceData> = z
  .object({
    text: RichTextSchema,
    source: z.string(),
    participant: z.string(),
    tags: z.array(z.string()),
  })
  .strict()

const CONFIDENCE = ['unstated', 'low', 'medium', 'high'] as const

interface ClaimData {
  readonly text: RichText
  readonly confidence: (typeof CONFIDENCE)[number]
}

const ClaimSchema: ZodType<ClaimData> = z
  .object({ text: RichTextSchema, confidence: z.enum(CONFIDENCE) })
  .strict()

interface FollowupData {
  readonly text: RichText
}

const FollowupSchema: ZodType<FollowupData> = z.object({ text: RichTextSchema }).strict()

const CAPABILITIES = {
  resizable: true,
  rotatable: false,
  textEditable: true,
  spatial: true,
  canHaveChildren: false,
  selectsAsUnit: false,
  hollow: false,
  connectable: true,
  markable: true,
  styleProps: ['color', 'textColor', 'font', 'align', 'verticalAlign', 'opacity'],
} as const

export const fixtureSourceType = defineObjectType<typeof FIXTURE_SOURCE, SourceData>({
  type: FIXTURE_SOURCE,
  schema: SourceSchema,
  currentVersion: 1,
  migrations: {},
  create: (init) => ({
    data: {
      text: init?.text ?? [{ text: '' }],
      source: init?.source ?? '',
      participant: init?.participant ?? '',
      tags: init?.tags ?? [],
    },
    frame: { width: 180, height: 180 },
  }),
  capabilities: CAPABILITIES,
  fields: [
    { key: 'source', meaning: 'record', label: 'Source', kind: 'text', placeholder: 'A study' },
    {
      key: 'participant',
      meaning: 'record',
      label: 'Participant',
      kind: 'text',
      placeholder: 'P07',
    },
    { key: 'tags', meaning: 'record', label: 'Tags', kind: 'tags', placeholder: 'pricing' },
  ],
  derivations: [{ type: FIXTURE_CLAIM, predicate: 'cites' }],
  describe: (object) => {
    const { source, participant, tags } = object.data
    const text = plainTextOf(object.data.text)
    return {
      body: object.data.text,
      searchText: [text, source, participant, ...tags].filter(Boolean).join(' '),
      summary:
        text.trim() === ''
          ? source.trim() === ''
            ? 'Empty source'
            : `Source: ${source}`
          : text.slice(0, 120),
      gist: text.trim().slice(0, 120),
      fields: { text, source, participant, tags },
    }
  },
})

export const fixtureClaimType = defineObjectType<typeof FIXTURE_CLAIM, ClaimData>({
  type: FIXTURE_CLAIM,
  schema: ClaimSchema,
  currentVersion: 1,
  migrations: {},
  create: (init) => ({
    data: { text: init?.text ?? [{ text: '' }], confidence: init?.confidence ?? 'unstated' },
    frame: { width: 260, height: 160 },
  }),
  capabilities: CAPABILITIES,
  fields: [
    {
      key: 'confidence',
      meaning: 'record',
      label: 'Confidence',
      kind: 'select',
      options: CONFIDENCE,
    },
  ],
  derivations: [{ type: FIXTURE_FOLLOWUP, predicate: 'derivesFrom' }],
  describe: (object) => {
    const text = plainTextOf(object.data.text)
    return {
      body: object.data.text,
      searchText: text,
      summary: text.trim() === '' ? 'Empty claim' : text.slice(0, 120),
      gist: text.trim().slice(0, 120),
      fields: { text, confidence: object.data.confidence },
    }
  },
})

export const fixtureFollowupType = defineObjectType<typeof FIXTURE_FOLLOWUP, FollowupData>({
  type: FIXTURE_FOLLOWUP,
  schema: FollowupSchema,
  currentVersion: 1,
  migrations: {},
  create: (init) => ({
    data: { text: init?.text ?? [{ text: '' }] },
    frame: { width: 240, height: 160 },
  }),
  capabilities: CAPABILITIES,
  describe: (object) => {
    const text = plainTextOf(object.data.text)
    return {
      body: object.data.text,
      searchText: text,
      summary: text.trim() === '' ? 'Empty follow-up' : text.slice(0, 120),
      gist: text.trim().slice(0, 120),
      fields: { text },
    }
  },
})

/**
 * The default registry plus the three fixtures, and the three types that are
 * written, tested and not shipped (`reaction`, `poll`, `poll-answer`: Tabletop
 * hides them rather than deleting them, and registering them again in
 * `createDefaultRegistry` is the whole of bringing them back). A sticky note is given the
 * promotions and derivation the product no longer declares for it, so the
 * generic conversion and derivation paths have something to run against.
 */
export function createFixtureRegistry(): ObjectTypeRegistry {
  const defaults = createDefaultRegistry()
    .list()
    .filter((definition) => definition.type !== stickyType.type)
  return new ObjectTypeRegistry([
    ...defaults,
    {
      ...stickyType,
      promotions: [FIXTURE_SOURCE, FIXTURE_CLAIM],
      derivations: [{ type: FIXTURE_CLAIM, predicate: 'cites' }],
    },
    fixtureSourceType,
    fixtureClaimType,
    fixtureFollowupType,
    // Built and tested, but not shipped: see `createFixtureRegistry`'s note.
    reactionType,
    pollType,
    pollAnswerType,
  ])
}
