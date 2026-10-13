import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The boot splash's structure, WHATEVER it looks like.
 *
 * It has to paint at first paint, before any stylesheet has loaded, so its
 * critical CSS lives inline in `index.html`, outside the reach of the tests that
 * read the stylesheet. What it looks like is the brand's business and is pinned
 * in `incumbent-splash.test.ts`; what must stay true of any splash is here: it is
 * inline, the checks it repeats agree with the router's, and its assets are
 * bundled rather than served from `public/`.
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
    expect(referenced.length).toBeGreaterThanOrEqual(4)
    // The guard above is only worth anything if a srcset was actually read.
    expect(sets.length).toBeGreaterThan(0)

    for (const path of referenced) {
      expect(path).not.toContain('/public/')
      expect(
        existsSync(resolve(process.cwd(), `.${String(path)}`)),
        `missing ${String(path)}`,
      ).toBe(true)
    }
    expect(existsSync(resolve(process.cwd(), 'public'))).toBe(false)
  })
})
