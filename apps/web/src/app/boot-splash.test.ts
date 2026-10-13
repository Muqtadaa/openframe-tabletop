import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CSS, THEMES } from './design-test-support.js'

/**
 * The boot splash's structure, WHATEVER it looks like.
 *
 * It has to paint at first paint, before any stylesheet has loaded, so its
 * critical CSS lives inline in `index.html`, outside the reach of the tests that
 * read the stylesheet. That makes its colours a second source of truth, and a
 * second source of truth drifts, so they are pinned here: every colour it paints
 * is a theme's surface or text colour, and the browser chrome is told the default
 * theme's. It is also inline, the checks it repeats agree with the router's, and
 * its assets (it has none now) are bundled rather than served from `public/`.
 */
const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const inlineStyle = /<style>([\s\S]*?)<\/style>/.exec(HTML)?.[1] ?? ''

describe('the boot splash', () => {
  it('has inline critical CSS, or it cannot paint before the stylesheet', () => {
    expect(inlineStyle).not.toBe('')
    expect(inlineStyle).toContain('#of-splash')
  })

  /*
   * The label promises a board only where one opens. The inline check cannot
   * import the router, so its two patterns are held to the router's own.
   */
  it('recognises a board link exactly as the router does', () => {
    const source = (path: string, name: string): string => {
      const file = readFileSync(resolve(process.cwd(), path), 'utf8')
      const found = new RegExp(`const ${name} = (/[^\\n]+/)\\n`).exec(file)?.[1]
      if (found === undefined) throw new Error(`${name} not found in ${path}`)
      return found
    }
    expect(HTML).toContain(
      `room !== null && ${source('src/app/collab-config.ts', 'SHARED_ID')}.test(room)`,
    )
    expect(HTML).toContain(
      `board !== null && ${source('src/app/route.ts', 'LOCAL_ID')}.test(board)`,
    )
  })

  /**
   * Nothing in `public/` — Vite copies that directory into every build, which is
   * how 4.7MB of benchmark boards nearly shipped. Brand assets go through the
   * bundler like any other import, so they are hashed and only the referenced
   * ones survive.
   */
  it('references assets that exist, and none of them from public/', () => {
    /*
     * `srcset` as well as `src`. The splash ships two widths now, and a reader
     * that only knew about `src` would have let the 2x file be renamed, moved
     * or deleted without a word — an unchecked reference is the whole failure
     * mode this test exists for.
     */
    const single = [...HTML.matchAll(/(?:src|href)="(\/src\/assets\/[^"]+)"/g)].map((m) => m[1])
    const sets = [...HTML.matchAll(/srcset="([^"]+)"/g)].flatMap((m) =>
      (m[1] ?? '')
        .split(',')
        .map((candidate) => candidate.trim().split(/\s+/)[0])
        .filter((path): path is string => path?.startsWith('/src/assets/') === true),
    )

    const referenced = [...new Set([...single, ...sets])]
    // The splash names none now; the check stays for the favicon and anything added.

    for (const path of referenced) {
      expect(path).not.toContain('/public/')
      expect(
        existsSync(resolve(process.cwd(), `.${String(path)}`)),
        `missing ${String(path)}`,
      ).toBe(true)
    }
    expect(existsSync(resolve(process.cwd(), 'public'))).toBe(false)
  })

  /*
   * Surface and text colours of EACH theme, read from the stylesheet. The
   * splash and the label/button text it paints are the only literals allowed
   * outside tokens.css, and only these.
   */
  it('paints only in the themes’ surface and text colours', () => {
    const allowed = new Set<string>()
    for (const { token } of THEMES) {
      for (const name of ['page', 'panel', 'ink', 'ink-muted', 'control-border', 'accent']) {
        allowed.add(token(name).toLowerCase())
      }
    }
    const used = (inlineStyle.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((hex) => hex.toLowerCase())
    expect(used.length).toBeGreaterThan(0)
    for (const hex of used) expect(allowed, hex).toContain(hex)
  })

  it('draws the sheet in each theme’s own surface colour', () => {
    const [dark, light] = THEMES
    const base = /#of-splash \{[^}]*background-color: (#[0-9a-fA-F]{6})/.exec(inlineStyle)?.[1]
    const themed =
      /:root\[data-theme='light'\] #of-splash \{[^}]*background-color: (#[0-9a-fA-F]{6})/.exec(
        inlineStyle,
      )?.[1]
    expect(dark?.name).toBe('default')
    expect(base?.toLowerCase()).toBe(dark?.token('page'))
    expect(themed?.toLowerCase()).toBe(light?.token('page'))
  })

  it('tells the browser chrome the surface colours, and only those', () => {
    const meta = /<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/.exec(HTML)?.[1]
    const [dark, light] = THEMES
    expect(meta?.toLowerCase()).toBe(dark?.token('page'))
    const script = /<script>\s*try \{[\s\S]*?<\/script>/.exec(HTML)?.[0] ?? ''
    const used = (script.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((hex) => hex.toLowerCase())
    expect(new Set(used)).toEqual(new Set([light?.token('page')]))
  })

  /*
   * The splash's fade is the product's own motion, written as a literal for the
   * same reason as its colours: `--of-quick` on `--of-ease`.
   */
  it('moves on the product’s curve and its quick duration', () => {
    const quick = /--of-quick:\s*(\d+ms)/.exec(CSS)?.[1]
    const ease = /--of-ease:\s*(cubic-bezier\([^)]*\))/.exec(CSS)?.[1]
    const transitions = [...inlineStyle.matchAll(/transition:\s*opacity ([^;]+);/g)].map(
      (match) => match[1],
    )
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) expect(transition).toBe(`${quick ?? ''} ${ease ?? ''}`)

    const script = readFileSync(resolve(process.cwd(), 'src/app/splash.ts'), 'utf8')
    expect(/const FADE_MS = (\d+)/.exec(script)?.[1]).toBe(quick?.replace('ms', ''))
  })
})
