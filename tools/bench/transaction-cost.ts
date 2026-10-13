/**
 * What a large batch of commands costs, on a board of real size (rule 10).
 *
 * Two costs were assumed small and never measured:
 *
 * - the dispatcher copies the whole object map once per COMMAND in a
 *   transaction, so a client creating 200 objects one command at a time paid
 *   200 copies on its own peer — and a remote batch is copied three times on
 *   every other peer;
 * - search describes every object to match it.
 *
 * The copies are COUNTED as well as timed. Time says whether it matters on
 * this machine; the count says why, and does not change with the machine. A
 * copy is any `Map` built at the board's size or larger while a case runs,
 * found by swapping the global `Map` for one that counts — nothing in core
 * knows it is being watched.
 *
 * This replaced `mcp-cost.ts` when the MCP server was removed from the
 * product. The dispatcher cases and the map-copy counts are the ones it held;
 * only the tool-reading cases left with the tools.
 *
 *   pnpm bench:fixtures && pnpm bench:transaction
 *   pnpm bench:transaction:smoke   (60 objects, one run: proves the script runs)
 */
import { readFileSync } from 'node:fs'

import {
  CommandDispatcher,
  allowAllCapabilities,
  createDefaultRegistry,
  createDocumentStore,
  createSequentialIdGenerator,
  deserializeBoard,
  fixedClock,
  searchBoard,
  type BoardDocument,
  type Command,
  type Patch,
} from '@openframe/core'

import { jsonTarget, writeMeasurements, type Measurement } from './results.js'

const smoke = process.argv.includes('--smoke')
const boards = smoke ? ['board-mixed-60'] : ['board-mixed-1000', 'board-mixed-10000']
const WARM = smoke ? 0 : 3
const RUNS = smoke ? 1 : 10
const BATCH = smoke ? 10 : 200

const registry = createDefaultRegistry()

function load(name: string): BoardDocument {
  const raw: unknown = JSON.parse(readFileSync(`tools/bench/fixtures/${name}.json`, 'utf8'))
  const result = deserializeBoard(raw, registry)
  if (result.status !== 'ok') throw new Error(`could not load ${name}: ${result.status}`)
  return result.document
}

/* ---------------------------------------------------------------- counting */

let copies = 0
let copyThreshold = Number.POSITIVE_INFINITY
const NativeMap = globalThis.Map
class CountingMap<K, V> extends NativeMap<K, V> {
  constructor(entries?: Iterable<readonly [K, V]> | null) {
    super(entries)
    if (this.size >= copyThreshold) copies += 1
  }
}

/** Mean milliseconds per run, and full-board map copies per run. */
async function measure(size: number, run: () => unknown): Promise<{ ms: number; copies: number }> {
  for (let i = 0; i < WARM; i++) await run()
  globalThis.Map = CountingMap
  copyThreshold = size
  copies = 0
  const started = performance.now()
  try {
    for (let i = 0; i < RUNS; i++) await run()
  } finally {
    globalThis.Map = NativeMap
    copyThreshold = Number.POSITIVE_INFINITY
  }
  return { ms: (performance.now() - started) / RUNS, copies: copies / RUNS }
}

/* ------------------------------------------------------------------- peers */

function dispatcherOn(document: BoardDocument) {
  const { store, writer } = createDocumentStore(document)
  const dispatcher = new CommandDispatcher({
    store,
    writer,
    registry,
    clock: fixedClock(1_700_000_000_000),
    ids: createSequentialIdGenerator(),
    capabilities: allowAllCapabilities,
  })
  return { store, dispatcher }
}

/* ------------------------------------------------------------------- cases */

const sticky = (i: number) => ({ type: 'sticky', x: 50_000 + i * 10, y: 50_000 })

function batchCommands(): Command[] {
  return Array.from({ length: BATCH }, (_, i) => ({
    kind: 'CreateObjects',
    objects: [sticky(i)],
  }))
}

/** What the other peers receive for a client's batch: its patches, as one remote batch. */
function remoteBatch(document: BoardDocument): readonly Patch[] {
  const { dispatcher } = dispatcherOn(document)
  const made = dispatcher.dispatch({
    kind: 'CreateObjects',
    objects: Array.from({ length: BATCH }, (_, i) => sticky(i)),
  })
  if (!made.ok) throw made.error
  return made.patches
}

async function bench(name: string): Promise<void> {
  const document = load(name)
  const size = document.objects.size
  const patches = remoteBatch(document)

  const rows: [string, { ms: number; copies: number }][] = [
    ['search, common word', await measure(size, () => searchBoard(document, registry, 'note'))],
    ['search, no match', await measure(size, () => searchBoard(document, registry, 'zzqqxx'))],
    [
      `${String(BATCH)} commands, one transaction`,
      await measure(size, () => {
        const result = dispatcherOn(document).dispatcher.transact('Batch', batchCommands())
        if (!result.ok) throw result.error
      }),
    ],
    [
      `one command of ${String(BATCH)} (control)`,
      await measure(size, () => {
        const result = dispatcherOn(document).dispatcher.dispatch({
          kind: 'CreateObjects',
          objects: Array.from({ length: BATCH }, (_, i) => sticky(i)),
        })
        if (!result.ok) throw result.error
      }),
    ],
    [
      'that batch arriving remotely',
      await measure(size, () => {
        const result = dispatcherOn(document).dispatcher.dispatch(
          { kind: 'ApplyRemotePatches', patches },
          { origin: 'remote', skipUndo: true },
        )
        if (!result.ok) throw result.error
      }),
    ],
  ]

  for (const [label, { ms, copies: made }] of rows) {
    const family = label.startsWith('search') ? 'search' : 'transaction'
    measurements.push(
      { metric: `${family}/${name}/${label}`, value: ms, unit: 'ms' },
      { metric: `copies/${name}/${label}`, value: made, unit: 'copies' },
    )
  }

  console.log(`\n${name} — ${String(size)} objects`)
  console.log(`${'case'.padEnd(44)}${'ms'.padStart(10)}${'map copies'.padStart(13)}`)
  for (const [label, { ms, copies: made }] of rows) {
    console.log(`${label.padEnd(44)}${ms.toFixed(2).padStart(10)}${String(made).padStart(13)}`)
  }
}

const measurements: Measurement[] = []
for (const name of boards) await bench(name)

const target = jsonTarget(process.argv)
if (target !== null) writeMeasurements(target, measurements)
