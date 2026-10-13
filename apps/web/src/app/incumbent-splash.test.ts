import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { readStyles } from '../styles/read-styles.js'

/**
 * The splash's COLOURS, in OpenFrame's own brand and worlds.
 *
 * It is the one place a colour is allowed to be written twice: it has to paint
 * at first paint, before any stylesheet has loaded, so its critical CSS lives
 * inline in `index.html` as literal values, outside the reach of the tests that
 * read the stylesheet. That is a second source of truth for the brand, and a
 * second source of truth drifts.
 *
 * So it is pinned here instead: every colour in the inline style has to BE one
 * of the tokens. Changing a brand token now either changes the splash or fails
 * the build. What must hold of ANY splash is in `boot-splash.test.ts`; this file
 * goes with the brand.
 */
const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const CSS = readStyles()

function token(name: string): string {
  const match = new RegExp(`--of-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(CSS)
  if (match?.[1] === undefined) throw new Error(`token --of-${name} is not defined`)
  return match[1].toLowerCase()
}

/** After Hours overrides `ink`, so the plain first-match reader would give the default world's. */
function afterHoursToken(name: string): string {
  const block = /:root\s*\[data-theme='after-hours'\]\s*\{([^}]*)\}/.exec(CSS)?.[1]
  if (block === undefined) throw new Error('no after-hours block')
  const match = new RegExp(`--of-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)
  if (match?.[1] === undefined) throw new Error(`after-hours --of-${name} is not defined`)
  return match[1].toLowerCase()
}

const inlineStyle = /<style>([\s\S]*?)<\/style>/.exec(HTML)?.[1] ?? ''

describe('the incumbent boot splash', () => {
  /*
   * Brand colours, plus each world's page colour for the quiet sheet a tab
   * gets once it has seen the artwork — a handover from the page to the page.
   */
  it('paints only in brand colours and the worlds’ page colours', () => {
    const allowed = new Set([
      token('brand-void'),
      afterHoursToken('ink'),
      token('page'),
      afterHoursToken('page'),
    ])
    const used = (inlineStyle.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((hex) => hex.toLowerCase())

    expect(used.length).toBeGreaterThan(0)
    for (const hex of used) expect(allowed).toContain(hex)
  })

  it('draws the quiet sheet in each world’s own page colour', () => {
    const notebook =
      /\[data-splash='quiet'\] #of-splash \{[^}]*background-color: (#[0-9a-fA-F]{6})/.exec(
        inlineStyle,
      )?.[1]
    const afterHours =
      /\[data-splash-world='after-hours'\] #of-splash \{[^}]*background-color: (#[0-9a-fA-F]{6})/.exec(
        inlineStyle,
      )?.[1]
    expect(notebook?.toLowerCase()).toBe(token('page'))
    expect(afterHours?.toLowerCase()).toBe(afterHoursToken('page'))
  })

  it('tells the browser chrome the quiet sheet’s colours, and only those', () => {
    const script = /<script>\s*try \{[\s\S]*?<\/script>/.exec(HTML)?.[0] ?? ''
    const used = (script.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((hex) => hex.toLowerCase())
    expect(new Set(used)).toEqual(new Set([token('page'), afterHoursToken('page')]))
  })

  /*
   * A bed with the product's control radius, not a 999px capsule: in this
   * product round means grab me, and the label does nothing when pressed.
   */
  it('beds the label with the control radius', () => {
    const label = /#of-splash p \{([^}]*)\}/.exec(inlineStyle)?.[1] ?? ''
    const radius = /border-radius:\s*(\d+px)/.exec(label)?.[1]
    const control = /--of-radius:\s*(\d+px)/.exec(CSS)?.[1]
    expect(control).toBeDefined()
    expect(radius).toBe(control)
  })

  /*
   * The splash's fades are the product's own motion, written as literals for
   * the same reason as its colours. They were 220ms and 320ms `ease-out`, off
   * the scale and off the curve every other surface uses.
   */
  it('moves on the product’s curve and its settle duration', () => {
    const settle = /--of-settle:\s*(\d+ms)/.exec(CSS)?.[1]
    const ease = /--of-ease:\s*(cubic-bezier\([^)]*\))/.exec(CSS)?.[1]
    const transitions = [...inlineStyle.matchAll(/transition:\s*opacity ([^;]+);/g)].map(
      (match) => match[1],
    )
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) expect(transition).toBe(`${settle ?? ''} ${ease ?? ''}`)

    const script = readFileSync(resolve(process.cwd(), 'src/app/splash.ts'), 'utf8')
    expect(/const FADE_MS = (\d+)/.exec(script)?.[1]).toBe(settle?.replace('ms', ''))
  })

  /** The label's scrim is the void at 82%, written in channels rather than hex. */
  it('writes the scrim from the same void the background uses', () => {
    const scrim = /rgb\((\d+) (\d+) (\d+) \/ \d+%\)/.exec(inlineStyle)
    expect(scrim).not.toBeNull()

    const void_ = token('brand-void')
    const channels = [1, 3, 5].map((i) => Number.parseInt(void_.slice(i, i + 2), 16))
    expect([Number(scrim?.[1]), Number(scrim?.[2]), Number(scrim?.[3])]).toEqual(channels)
  })

  it('tells the browser chrome the same colour', () => {
    const meta = /<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/.exec(HTML)?.[1]
    expect(meta?.toLowerCase()).toBe(token('brand-void'))
  })

  /**
   * The backdrop is inlined, not fetched. A loading screen that waits on the
   * network to show that it is loading has the logic backwards, and this is the
   * assertion that stops someone "tidying" the data URI into a file.
   */
  it('inlines its own first frame', () => {
    const lqip = /url\('(data:image\/webp;base64,[^']+)'\)/.exec(inlineStyle)?.[1]
    expect(lqip).toBeDefined()
    expect((lqip ?? '').length).toBeLessThan(2048)
  })
})
