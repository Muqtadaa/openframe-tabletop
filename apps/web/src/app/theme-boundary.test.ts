import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CSS, THEMES, channels, contrast } from './design-test-support.js'

/**
 * Application theme and Scene content are separate token spaces (ADR T010).
 *
 * `--of-*` styles the application and a theme may move it. `--sc-*` is the
 * scene: the ground, the grid, every colour authored into a board, and the
 * apparatus drawn over it. NO theme may move it, because a map must not be
 * reinterpreted by the interface around it. A dark application around a
 * daylight map still shows a daylight map.
 *
 * The failure this prevents is silent: it arrives as a report that a map's
 * colours changed when somebody switched theme.
 */

/** Every rule in the stylesheet, selector and body, comments removed. */
function rules(): { readonly selector: string; readonly body: string }[] {
  const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = '', body = '']) => ({
    selector: selector.trim(),
    body,
  }))
}

describe('the scene is not themed', () => {
  it('declares every --sc-* token in the one unthemed :root, and nowhere else', () => {
    const declared = rules().filter(({ body }) => /(?<![\w-])--sc-[\w-]+\s*:/.test(body))
    expect(declared.length, 'the scene tokens are found, so this is not vacuous').toBeGreaterThan(0)
    for (const { selector } of declared) expect(selector).toBe(':root')
  })

  it('has at least one theme to guard', () => {
    expect(
      rules().filter(({ selector }) => selector.includes('data-theme')).length,
    ).toBeGreaterThan(0)
  })

  it('has no theme block that assigns a scene token', () => {
    const themed = rules()
      .filter(({ selector }) => selector.includes('data-theme'))
      .filter(({ body }) => /--sc-[\w-]+\s*:/.test(body))
      .map(({ selector }) => selector)
    expect(themed).toEqual([])
  })

  it.each(THEMES)('resolves every scene token to the same value — $name', ({ token }) => {
    const base = THEMES[0]
    const names = [...CSS.matchAll(/(?<![\w-])--(sc-[\w-]+)\s*:\s*#[0-9a-fA-F]{6}/g)].map(
      (match) => match[1] ?? '',
    )
    expect(names.length).toBeGreaterThan(20)
    for (const name of names) expect(token(name), name).toBe(base?.token(name))
  })
})

/*
 * Object stylesheets paint authored content, so the colours they use come from
 * the scene. An application token there would follow the theme, and a note's
 * text would go pale on a pale ground the first time somebody chose dark.
 * Editing rings and other apparatus over content take `--sc-select`.
 */
const CONTENT_STYLESHEETS = ['objects.css', 'table.css', 'code.css', 'frames.css', 'connectors.css']
const COLOUR_PROPERTY =
  /(?<![\w-])(color|background(?:-color)?|border(?:-[a-z]+)*|outline|box-shadow|text-shadow|fill|stroke)\s*:\s*([^;]+);/g

describe('content is painted from the scene', () => {
  it.each(CONTENT_STYLESHEETS)('%s uses no application colour', (file) => {
    const source = readFileSync(resolve(process.cwd(), 'src/styles', file), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const application = [...source.matchAll(COLOUR_PROPERTY)]
      .filter(([, , value = '']) =>
        /var\(--of-(bg|page|panel|panel-border|control-border|ink|ink-muted|accent|accent-soft|guide|hover|danger|danger-wash|danger-edge)\)/.test(
          value,
        ),
      )
      .map(([whole = '']) => whole.trim())
    expect(application).toEqual([])
  })
})

/*
 * The grid is a measuring aid, not a control: deliberately BELOW the 3:1 floor,
 * so a later "improve contrast" pass cannot turn it into a cage the content has
 * to fight, and deliberately ABOVE a whisper, because it is how a GM and the
 * players place scenery and tokens and it has to read on the ground. It is also a
 * Scene's own state (ADR T005), so these are the defaults.
 */
describe('the scene ground', () => {
  const [{ token }] = THEMES as [(typeof THEMES)[number]]

  it('keeps the grid quiet enough to be ground, and still visible', () => {
    expect(contrast(token('sc-rule'), token('sc-ground'))).toBeLessThan(2)
    expect(contrast(token('sc-rule-decade'), token('sc-ground'))).toBeLessThan(2.5)
    expect(contrast(token('sc-rule-decade'), token('sc-ground'))).toBeGreaterThan(1.2)
    // The owner's requirement: the rule you aim at is clearly visible on the mid-tone ground.
    expect(contrast(token('sc-rule-decade'), token('sc-ground'))).toBeGreaterThanOrEqual(2)
    expect(contrast(token('sc-rule'), token('sc-ground'))).toBeGreaterThanOrEqual(1.3)
  })
})

/*
 * The application reserves one red for destructive and corrective meaning. A
 * content red sitting close to it would let a red token read as a warning, and
 * the inspector offers that hue as an ordinary choice.
 */
describe.each(THEMES)('the correction red — $name', ({ token }) => {
  it('is clear of the content red', () => {
    const [cr, cg, cb] = channels(token('sc-c-red'))
    const [dr, dg, db] = channels(token('danger'))
    expect(Math.hypot(cr - dr, cg - dg, cb - db)).toBeGreaterThan(30)
  })
})
