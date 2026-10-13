import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDefaultRegistry } from '@openframe/core'
import { describe, expect, it } from 'vitest'

import { CSS } from './design-test-support.js'

/**
 * How the stylesheet is kept honest, WHATEVER it paints.
 *
 * Colour lives in tokens, corners and spaces and layers come from a scale, time
 * from one clock, and the file has to parse. None of it says what the world
 * looks like, so none of it goes when a world is replaced.
 */

/**
 * Colour lives on `:root` and nowhere else.
 *
 * The redesign changed the accent and left `.of-marquee` painting the OLD one as
 * an `rgb()` literal, and the notice banner kept a cream-on-tan pair that the
 * world's own header bans — both invisible because a literal answers to nothing.
 * Every value the app paints must come from a token, so changing a token changes
 * the app.
 */
describe('no colour literals outside the token block', () => {
  /**
   * `.of-dev__*` is the bench panel's instrumentation.
   *
   * Its COMPONENT is stripped from a production build by the compile-time
   * `define` (rule 12) — verified by grepping a clean `pnpm build` for
   * `DevPanel`, which finds nothing. Its rules still ship in the stylesheet,
   * inert, because CSS has no equivalent of that branch. The comment here used
   * to claim both were stripped, which was half true and the misleading half.
   */
  const DEV_ONLY = /\.of-dev__[^{]*\{[^}]*\}/g
  /**
   * The colour PICKER, which paints the colour space rather than the scheme.
   *
   * Its hue ramp is the spectrum and the two washes over its area are the
   * definition of saturation and value. A token there would mean showing
   * somebody a different colour from the one they are pointing at, so these
   * rules are exempt — and narrowly: `.of-picker__area`, `__hue` and
   * `__pointer` only, with their pseudo-elements. The picker's own chrome,
   * its panel, border, text and the low-contrast warning, is tokenised like
   * everything else and is NOT covered by this.
   */
  const COLOUR_SPACE = /\.of-picker__(area|hue|pointer)(::(before|after))?[^{]*\{[^}]*\}/g

  it('defines every colour as a token', () => {
    const withoutRoot = CSS.replace(/:root[^{]*\{[^}]*\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(DEV_ONLY, '')
      .replace(COLOUR_SPACE, '')

    const literals = withoutRoot.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []
    expect(literals).toEqual([])
  })

  /**
   * And the exemption cannot be used as a door.
   *
   * A rule that excludes part of the file is a rule somebody can widen by
   * putting a literal in an excluded selector. This asserts the exclusion
   * covers what it says: three selectors, and the picker's own chrome is
   * still measured — verified by putting `color: #ff0000` on
   * `.of-picker__contrast` and watching the test above fail.
   */
  it('exempts only the three selectors that paint the spectrum', () => {
    const exempted = [...CSS.matchAll(COLOUR_SPACE)].map(
      (match) => /\.of-picker__\w+(::\w+)?/.exec(match[0])?.[0],
    )
    expect(new Set(exempted)).toEqual(
      new Set([
        '.of-picker__area',
        '.of-picker__area::before',
        '.of-picker__area::after',
        '.of-picker__pointer',
        '.of-picker__hue',
      ]),
    )
  })
})

/**
 * The radius scale (DESIGN.md, Shapes).
 *
 * Seventeen radii were in use against one token, so "corners get smaller the
 * closer a form is to the page" was a sentence rather than a property of the
 * stylesheet. Every corner now names its step; a new one either takes a step
 * or adds one to the scale in `:root`, where it has to say what it is for.
 */
describe('the radius scale', () => {
  it('draws every corner from a step of the scale', () => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const off: string[] = []
    for (const [, value = ''] of source.matchAll(/(?<![\w-])border-radius:\s*([^;]+);/g)) {
      const parts = value.trim().split(/\s+(?![^(]*\))/)
      const onScale = parts.every(
        (part) => part === '0' || part === 'inherit' || /^var\(--of-radius(-[a-z]+)?\)$/.test(part),
      )
      if (!onScale) off.push(value.trim())
    }
    expect(off).toEqual([])
  })

  it('defines the scale it asks for', () => {
    const defined = new Set([...CSS.matchAll(/(--of-radius(?:-[a-z]+)?):/g)].map((m) => m[1]))
    const used = new Set([...CSS.matchAll(/var\((--of-radius(?:-[a-z]+)?)\)/g)].map((m) => m[1]))
    expect([...used].filter((name) => !defined.has(name))).toEqual([])
  })
})

/**
 * The layers. Ten bare integers from 1 to 100 said nothing about why one thing
 * paints over another; every z-index now names a layer in `:root`, which is
 * where the order is read as one list and has to be argued for.
 */
describe('the layers', () => {
  it('stacks everything on a named layer', () => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const off = [...source.matchAll(/(?<![\w-])z-index:\s*([^;]+);/g)]
      .map((match) => (match[1] ?? '').trim())
      .filter((value) => !/^var\(--of-z-[a-z]+\)$/.test(value) && value !== 'auto' && value !== '0')
    expect(off).toEqual([])
  })

  it('defines every layer it asks for', () => {
    const defined = new Set([...CSS.matchAll(/(--of-z-[a-z]+):/g)].map((m) => m[1]))
    const used = new Set([...CSS.matchAll(/var\((--of-z-[a-z]+)\)/g)].map((m) => m[1]))
    expect([...used].filter((name) => !defined.has(name))).toEqual([])
  })
})

/**
 * Motion (DESIGN.md, Motion). Timing is `--of-quick`, `--of-settle`,
 * `--of-hold` and `--of-stagger` on `--of-ease`; the tool tip ran its own
 * 110ms ease-out and the sheets their own 160ms beside a token that already
 * said 140. A duration anywhere but the token block is a second clock.
 */
describe('one clock', () => {
  it('times nothing outside the motion tokens', () => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const declarations = [...source.matchAll(/(?<![\w-])(transition|animation)[\w-]*:\s*([^;]+);/g)]
    const literal = declarations
      .map((match) => (match[2] ?? '').trim())
      .filter((value) => /\d+m?s\b|ease-(in|out)|\blinear\b/.test(value))
    expect(literal).toEqual([])
  })
})

/**
 * The spacing scale. Sixteen values were in use for padding, margins and gaps,
 * with a 3, 5, 7 and 9 beside the 2, 4, 6 and 8 they were meant to be. Every
 * space from 2px to 20px now names a step; above that a length is a size, not
 * rhythm, and a 1px hairline offset or a negative pull stays as written.
 */
describe('the spacing scale', () => {
  it('spaces everything from 2px to 20px on a step of the scale', () => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const off: string[] = []
    const property = /(?<![\w-])((?:padding|margin)[\w-]*|gap|row-gap|column-gap):\s*([^;]+);/g
    for (const [, name = '', value = ''] of source.matchAll(property)) {
      for (const [, px = ''] of value.matchAll(/(?<![\w.(-])(\d+)px/g)) {
        if (Number(px) >= 2 && Number(px) <= 20) off.push(`${name}: ${value.trim()}`)
      }
    }
    expect(off).toEqual([])
  })

  /*
   * Above the scale a space is a size — but a size on the page's own rule:
   * DESIGN.md says every offset in the chrome is a multiple of ten. The front
   * door's 28px gap and 48px/24px page margins, and a pin lifted by -26px,
   * were each a number chosen by eye (audit 2026-09-27).
   */

  it('defines every step it asks for', () => {
    const defined = new Set([...CSS.matchAll(/(--of-space-\d+):/g)].map((m) => m[1]))
    const used = new Set([...CSS.matchAll(/var\((--of-space-\d+)\)/g)].map((m) => m[1]))
    expect([...used].filter((name) => !defined.has(name))).toEqual([])
  })
})

/**
 * The icon button. Six private versions at four sizes became one, and the
 * ones under 30px were under this world's target for a secondary control.
 * Nothing may bring a private one back beside it at a smaller size.
 */
describe('one icon button', () => {
  it('leaves none of the private versions behind', () => {
    const retired = [
      '.of-status__action',
      '.of-home__row-action ',
      '.of-inspector__remove',
      '.of-arrange__button',
      '.of-zoom__button',
    ]
    expect(retired.filter((selector) => CSS.includes(selector))).toEqual([])
  })
})

/**
 * The stylesheet has to PARSE.
 *
 * This file is only minified by the production build, so a structurally broken
 * stylesheet passed every test, ran fine in dev and e2e, and failed in Vercel —
 * which is the slowest possible place to find out. It happened: resolving a
 * merge by deleting conflict-marker lines ate a closing brace and the opening
 * of the next comment, joining a rule to a comment body.
 *
 * Not a full CSS parser — just the structure that mechanical editing breaks.
 */
describe('the stylesheet is well formed', () => {
  /** Comments first: a brace inside one is text, not structure. */
  const withoutComments = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

  it('has no unterminated or stray comment markers', () => {
    expect(CSS.split('/*').length, 'unbalanced comment markers').toBe(CSS.split('*/').length)
    /*
     * A comment body line left outside any comment is the exact shape of the
     * bug. `* { … }` is the universal selector, not a comment body, so a brace
     * on the line excludes it.
     */
    for (const [index, line] of withoutComments.split('\n').entries()) {
      const loose = /^\s*\*\s/.test(line) && !line.includes('{')
      expect(loose, `line ${String(index + 1)} is a loose comment body`).toBe(false)
    }
  })

  it('balances its braces', () => {
    const opens = (withoutComments.match(/\{/g) ?? []).length
    const closes = (withoutComments.match(/\}/g) ?? []).length
    expect(opens).toBe(closes)
  })

  it('never leaves a conflict marker behind', () => {
    expect(/^(<{7}|={7}|>{7})/m.test(CSS)).toBe(false)
  })
})

/*
 * The format bar's size readout names each step of the type ladder as a
 * multiple of the object's own size. Those multiples ARE the `.of-size--*`
 * rules, so the readout is held to the stylesheet: change a step's em and
 * leave the readout alone, and the bar would name a size the text is not.
 */
describe('the format bar names the sizes the stylesheet draws', () => {
  it('matches every .of-size rule, and md is the object itself', async () => {
    const { SIZE_SCALE } = await import('../views/FormatBar.js')
    for (const [token, scale] of Object.entries(SIZE_SCALE)) {
      const rule = new RegExp(`\\.of-size--${token}\\s*\\{\\s*font-size:\\s*([\\d.]+)em`).exec(CSS)
      if (token === 'md') {
        expect(rule, 'md is the object size and has no rule').toBeNull()
        expect(scale).toBe(1)
      } else {
        expect(rule?.[1], `.of-size--${token}`).toBe(String(scale))
      }
    }
  })
})

/*
 * A fresh text object's box, against the type it is set in. It was 48 units
 * tall at 22px on a 1.3 line — one line — so the first sentence anybody typed
 * wrapped straight out of sight.
 */
describe('a fresh text box', () => {
  it('holds two lines of display type', () => {
    const size = Number(/--of-type-display:\s*(\d+)px/.exec(CSS)?.[1])
    const leading = Number(/\.of-text\s*\{[^}]*line-height:\s*([\d.]+)/.exec(CSS)?.[1])
    const text = createDefaultRegistry().get('text')
    expect(size).toBeGreaterThan(0)
    expect(leading).toBeGreaterThan(0)
    expect(text?.create().frame.height).toBeGreaterThanOrEqual(2 * size * leading)
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
   * The interface scale moved onto a tokenised rhythm and every height became
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

/**
 * A token nothing defines is a declaration that silently does nothing.
 *
 * `var(--of-rule-decade)` outlived the palette it came from: the slider tracks
 * and three dividers drew nothing, and the contrast test passed over all of it
 * because it measures pairs that exist, not references that do not. Every
 * custom property the stylesheet reads is either defined in it or set inline by
 * the interface, which is the short list below.
 */
describe('every token it reads is defined', () => {
  const INLINE = new Set([
    '--of-depth',
    '--of-row',
    '--of-tool-cursor',
    '--of-clamp-lines',
    '--of-valign',
    '--of-presence-hue',
  ])

  it('reads no custom property that nothing sets', () => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const defined = new Set(
      [...source.matchAll(/(?<![\w-])(--(?:of|sc)-[\w-]+)\s*:/g)].map((m) => m[1] ?? ''),
    )
    const read = new Set([...source.matchAll(/var\((--(?:of|sc)-[\w-]+)/g)].map((m) => m[1] ?? ''))
    expect(defined.size, 'the tokens are found, so this is not vacuous').toBeGreaterThan(50)
    expect([...read].filter((name) => !defined.has(name) && !INLINE.has(name))).toEqual([])
  })
})
