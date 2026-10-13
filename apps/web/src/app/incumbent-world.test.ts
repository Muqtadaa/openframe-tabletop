import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CSS, THEMES, channels, contrast, luminance } from './design-test-support.js'

/**
 * OpenFrame's OWN visual world: the Notebook, and After Hours beside it.
 *
 * These are the rules that make that world what it is — the ruled ground held
 * below the control floor, one red kept for correction, ink that is never pure
 * black, an offset rhythm on tens, the slip's corner and shadow, what a frame is
 * laid on. They are decisions of the design, not of WCAG, so they live apart
 * from `a11y-floor.test.ts` and `stylesheet-discipline.test.ts`, which hold
 * whatever world replaces this one.
 *
 * Retired with the world, in the shell work of Phase 0 (docs/plans/
 * 01-phase-0-execution.md, WP 0.13); the new world brings assertions of its own.
 * Nothing here was weakened to fit that move: each test is the one that was in
 * `design-tokens.test.ts`, unedited.
 */

/** Every theme must define a palette; a typo in the selector would silently skip one. */
if (THEMES.length < 2)
  throw new Error(`expected the default world and After Hours, got ${String(THEMES.length)}`)

describe.each(THEMES)('incumbent palette — $name', ({ token }) => {
  /**
   * And the black slip is not the page.
   *
   * In After Hours the ground is already dark, so a black slip that matched it
   * would be a hole in the page rather than something laid on it — the exact
   * failure the night world's lit top edge exists to prevent.
   */
  it('keeps the black slip clear of the ground it sits on', () => {
    const [sr, sg, sb] = channels(token('s-black'))
    const [br, bg, bb] = channels(token('bg'))
    expect(Math.hypot(sr - br, sg - bg, sb - bb)).toBeGreaterThan(20)
  })

  /**
   * The quadrille is ground, not a control: it is deliberately BELOW the 3:1
   * floor. Asserting the ceiling stops a later "improve contrast" pass turning
   * the page rule into a cage the content has to fight.
   */
  it('keeps the page rule quiet enough to be ground', () => {
    expect(contrast(token('rule'), token('page'))).toBeLessThan(2)
    expect(contrast(token('rule-decade'), token('page'))).toBeLessThan(2.5)
    // ...but still visible. A rule nobody can see is not a rule.
    expect(contrast(token('rule-decade'), token('page'))).toBeGreaterThan(1.2)
  })

  /**
   * The world reserves ONE red for destructive and corrective meaning. When the
   * content red sat 8 units away from it in sRGB the reservation was defeated by
   * the palette itself: a red slip on the page read as a correction mark, and
   * the inspector offered that hue as an ordinary choice.
   */
  it('keeps the content red clear of the correction red', () => {
    const [cr, cg, cb] = channels(token('c-red'))
    const [dr, dg, db] = channels(token('danger'))
    expect(Math.hypot(cr - dr, cg - dg, cb - db)).toBeGreaterThan(30)
  })

  it('never uses pure black as ink', () => {
    expect(token('ink')).not.toBe('#000000')
    const [r, , b] = channels(token('ink'))
    // Real ink carries a cast; a neutral near-black is the untinted default.
    expect(Math.abs(b - r)).toBeGreaterThan(4)
  })
})

/**
 * The record panel's columns have to add up.
 *
 * Its width was chosen so a full row of the swatch grid fits, and the swatches
 * live in the control column — so the label column is spending the same
 * budget. Widening labels (which had to happen: they come from the registry
 * now, and "participant" was being clipped to "participa") silently takes
 * space from the swatches, and a grid that wraps short of its own column count
 * reads as an accident rather than a palette.
 *
 * The column count is read from the grid rather than written here. This test
 * was named for SEVEN swatches after the palette had become a 6×2 grid, so it
 * went on proving room for a row that no longer existed.
 *
 * The numbers live in two files — the panel's width in `Inspector.tsx`, the
 * columns in the stylesheet — so nothing but arithmetic connects them. This is
 * that arithmetic, run on every build.
 */
describe('the record panel fits what it promises to show', () => {
  /*
   * Resolves a token, because these sizes ARE tokens now.
   *
   * The interface scale moved onto the quadrille and every height became
   * `var(--of-hit-sm)` and friends, at which point this arithmetic stopped
   * being able to read its own inputs. Teaching it the token table is the only
   * version that survives the next change; matching literal pixels would have
   * meant un-tokenising the stylesheet to keep a test happy.
   */
  const SIZES = new Map<string, number>()
  for (const [, name = '', value = ''] of CSS.matchAll(/(--of-[\w-]+):\s*(\d+)px;/g)) {
    SIZES.set(name, Number(value))
  }

  const px = (pattern: RegExp): number => {
    const match = pattern.exec(CSS)
    const value = match?.[1]
    if (value === undefined) throw new Error(`No match for ${String(pattern)}`)
    const token = SIZES.get(value.replace(/^var\(|\)$/g, ''))
    if (token !== undefined) return token
    const literal = Number(value.replace(/px$/, ''))
    if (Number.isNaN(literal)) throw new Error(`Cannot read a size from "${value}"`)
    return literal
  }

  it('leaves room for a full row of the swatch grid', () => {
    const inspector = readFileSync(resolve(process.cwd(), 'src/ui/Inspector.tsx'), 'utf8')
    const widthMatch = /const PANEL_WIDTH = (\d+)/.exec(inspector)
    expect(widthMatch?.[1]).toBeDefined()
    const panelWidth = Number(widthMatch?.[1])

    const size = String.raw`(\d+px|var\(--of-[\w-]+\))`
    const read = (pattern: string): number => px(new RegExp(pattern.replace('SIZE', size)))

    const labelColumn = read(String.raw`\.of-field \{[^}]*grid-template-columns:\s*SIZE`)
    const columnGap = read(String.raw`\.of-field \{[^}]*\n\s*gap:\s*SIZE`)
    const columns = /\.of-swatches \{[^}]*grid-template-columns:\s*repeat\((\d+),/.exec(CSS)?.[1]
    expect(columns).toBeDefined()
    const perRow = Number(columns)
    const swatch = read(
      String.raw`\.of-swatches \{[^}]*grid-template-columns:\s*repeat\(\d+,\s*SIZE`,
    )
    const swatchGap = read(String.raw`\.of-swatches \{[^}]*gap:\s*SIZE`)
    const sidePadding = read(String.raw`\.of-inspector \{[^}]*\n\s*padding:\s*SIZE`)
    // The panel's own 1px border, both sides.
    const border = 2

    const control = panelWidth - border - sidePadding * 2 - labelColumn - columnGap
    const swatchRow = swatch * perRow + swatchGap * (perRow - 1)

    expect(swatchRow).toBeLessThanOrEqual(control)
  })
})

/*
 * Above the scale a space is a size — but a size on the page's own rule.
 */
describe('the spacing rhythm', () => {
  /*
   * Above the scale a space is a size — but a size on the page's own rule:
   * DESIGN.md says every offset in the chrome is a multiple of ten. The front
   * door's 28px gap and 48px/24px page margins, and a pin lifted by -26px,
   * were each a number chosen by eye (audit 2026-09-27).
   */
  it('spaces everything above the scale on the rule', () => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const off: string[] = []
    const property = /(?<![\w-])((?:padding|margin)[\w-]*|gap|row-gap|column-gap):\s*([^;]+);/g
    for (const [, name = '', value = ''] of source.matchAll(property)) {
      for (const [, px = ''] of value.matchAll(/(?<![\w.(])-?(\d+)px/g)) {
        if (Number(px) > 20 && Number(px) % 10 !== 0) off.push(`${name}: ${value.trim()}`)
      }
    }
    expect(off).toEqual([])
  })
})

/*
 * AFTER HOURS, where a slip is a deep colour on a deep page. Violet and blue —
 * a hypothesis and an insight, the slips that matter most — were 1.2:1 on the
 * night page, held apart only by a 9% lit edge; and a white slip was 18:1,
 * the brightest thing on the board by some way. So a slip carries a hairline
 * that clears 3:1 on the page, read off the slip shadow itself, and white
 * paper is dimmed until it is no brighter than the ink.
 */
describe.each(THEMES.filter((theme) => theme.name !== 'default'))(
  'slips at night — $name',
  ({ name, token }) => {
    const block =
      new RegExp(`:root\\[data-theme=['"]${name}['"]\\]\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? ''

    it('carries a hairline that shows on the page (3:1)', () => {
      const ring = /--of-slip-ring:([^;]*);/.exec(block)?.[1] ?? ''
      const edge = /0 0 0 1px var\(--of-([\w-]+)\)/.exec(ring)?.[1]
      expect(edge, 'the night slip ring names its hairline as a token').toBeDefined()
      // And the ring is actually worn, by the note.
      for (const slip of ['of-sticky']) {
        const body = new RegExp(`\\.${slip}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? ''
        expect(body, slip).toMatch(/box-shadow:[^;]*var\(--of-slip-ring\)/)
      }
      expect(contrast(token(edge ?? ''), token('page'))).toBeGreaterThanOrEqual(3)
    })

    it('white paper is no brighter than the ink', () => {
      expect(contrast(token('s-white'), token('page'))).toBeLessThanOrEqual(
        contrast(token('ink'), token('page')),
      )
    })
  },
)

/*
 * A FRAME nobody has coloured is laid on the world's paper (audit 2026-09-27).
 *
 * At night it was white paper under a lamp — dimmed, and still a bright slab
 * the size of a region of the board, under everything placed on it. The
 * owner chose night paper: in the Notebook the paper is white, as it always
 * was; After Hours it is the panel stock, the same dark sheet the board's own
 * panels are cut from. A white somebody CHOSE stays white — this is the
 * default, not the palette.
 */
describe.each(THEMES)("a frame's paper — $name", ({ name, token }) => {
  const block =
    name === 'default'
      ? [...CSS.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1] ?? '').join('\n')
      : (new RegExp(`:root\\[data-theme=['"]${name}['"]\\]\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? '')
  const paper = /--of-frame-paper:\s*var\(--of-([\w-]+)\)/.exec(block)?.[1]

  it('is named in this world, as another token', () => {
    expect(paper, 'the frame paper names the stock it is').toBeDefined()
  })

  it(name === 'default' ? 'is white paper by day' : 'is the panel stock at night', () => {
    expect(paper).toBe(name === 'default' ? 's-white' : 'panel')
  })

  it('is never brighter than the ink, and never brighter than white paper', () => {
    const sheet = token(paper ?? '')
    expect(contrast(sheet, token('page'))).toBeLessThanOrEqual(
      contrast(token('ink'), token('page')),
    )
    expect(luminance(sheet)).toBeLessThanOrEqual(luminance(token('s-white')))
  })
})

/*
 * The plain kit — shapes, code, images, tables — stays plain, but it is stock
 * on the same page as the slips, so it is cut and laid the same way: the
 * page's 2px corner and the one slip height (DESIGN.md). Code took the
 * control radius, an image the apparatus radius, and none of them sat above
 * the page at all. Shapes are held out: a box shadow is a rectangle, and a
 * diamond's is not.
 */
describe('the plain kit is stock on the page', () => {
  const rule = (selector: string): string =>
    new RegExp(`${selector.replace(/[.-]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ??
    ''

  it.each(['.of-code', '.of-image-frame', '.of-table'])(
    '%s is cut and laid like a slip',
    (selector) => {
      const body = rule(selector)
      expect(body).toMatch(/border-radius:\s*var\(--of-radius-slip\)/)
      expect(body).toMatch(/box-shadow:\s*var\(--of-slip-shadow\)/)
    },
  )
})
