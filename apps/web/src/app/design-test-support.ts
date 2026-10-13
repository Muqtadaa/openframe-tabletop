import { COLOR_TOKENS } from '@openframe/core'

import { readStyles } from '../styles/read-styles.js'

/**
 * What the design tests share: the REAL stylesheet, its palettes, and the
 * arithmetic that measures a pair.
 *
 * Parsing the stylesheet rather than restating hex values is the whole point:
 * a duplicated palette drifts, and a test then passes against colours the app
 * stopped using. Three files read it. `a11y-floor.test.ts` is what WCAG 2.2 AA
 * asks of ANY world and survives a redesign; `stylesheet-discipline.test.ts` is
 * how the stylesheet is kept honest, whatever it paints; `incumbent-world.test.ts`
 * is OpenFrame's own inherited visual world and is retired
 * with it. The split exists so replacing a world cannot take a floor with it.
 */
export const CSS = readStyles()

/**
 * EVERY theme, not the first one that matches.
 *
 * The original `token()` took the first `--of-x:` in the file, which was exact
 * while there was one palette and quietly wrong the moment a second arrived:
 * a second theme could have shipped an unreadable pair and this suite would have
 * gone on measuring the default world and passing. A test that stops covering
 * what it claims to cover is worse than no test, because it is trusted.
 *
 * Verified by breaking it: setting the a second theme's `ink` to `#3b2a63` while the
 * old single-match `token()` was in place kept all 26 assertions green, and
 * fails 3 of them here.
 */
export interface Theme {
  readonly name: string
  readonly token: (name: string) => string
}

function blockOf(source: string): Map<string, string> {
  const values = new Map<string, string>()
  // Application tokens are keyed by their bare name; scene tokens keep their
  // `sc-` prefix, so a pair names which namespace each side is from.
  for (const [, space, name, value] of source.matchAll(
    /--(of|sc)-([\w-]+):\s*(#[0-9a-fA-F]{6})/g,
  )) {
    if (name !== undefined && value !== undefined) {
      values.set(space === 'sc' ? `sc-${name}` : name, value)
    }
  }
  return values
}

function readThemes(): Theme[] {
  const base = new Map<string, string>()
  const overrides = new Map<string, Map<string, string>>()

  for (const match of CSS.matchAll(/:root\s*(\[data-theme=['"]([\w-]+)['"]\])?\s*\{([^}]*)\}/g)) {
    const [, , name, body] = match
    if (body === undefined) continue
    const values = blockOf(body)
    if (values.size === 0) continue
    if (name === undefined) {
      for (const [key, value] of values) base.set(key, value)
    } else {
      overrides.set(name, new Map([...(overrides.get(name) ?? []), ...values]))
    }
  }

  if (base.size === 0) throw new Error('no palette found on :root')

  const lookup =
    (values: Map<string, string>) =>
    (name: string): string => {
      // Falls back to the base palette exactly as the cascade does, so a theme
      // that overrides only part of the world is still measured whole.
      const value = values.get(name) ?? base.get(name)
      if (value === undefined) throw new Error(`token ${name} is not defined as a hex colour`)
      return value
    }

  return [
    { name: 'default', token: lookup(base) },
    ...[...overrides].map(([name, values]) => ({ name, token: lookup(values) })),
  ]
}

export const THEMES = readThemes()

/**
 * The content hues, FROM THE PALETTE — never a list written out here.
 *
 * Five suites below carried their own copy of seven names. The palette grew to
 * eleven and every one of them went on measuring the original seven and
 * passing, which is the exact failure `readThemes` was rewritten to fix one
 * level up: a test that quietly stops covering what it claims to cover is
 * worse than no test, because it is trusted.
 *
 * Black and white are held out and asserted separately. They are the two
 * tokens that mean themselves rather than naming a hue — ink and paper are one
 * value — so "the ink reads on the paper" is 1:1 for them by construction, and
 * folding them in would mean either a failing suite or a weakened floor.
 */
const NEUTRAL = ['black', 'white'] as const
export const HUES = COLOR_TOKENS.filter(
  (token): token is Exclude<(typeof COLOR_TOKENS)[number], 'black' | 'white'> =>
    !(NEUTRAL as readonly string[]).includes(token),
)

/** A token as the CSS names it (`of-accent`, `sc-c-red`) to the key `token()` takes. */
export const tk = (full: string): string => full.replace(/^of-/, '')

export function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}
