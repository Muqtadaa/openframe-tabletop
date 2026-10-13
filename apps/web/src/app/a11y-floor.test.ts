import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COLOR_TOKENS } from '@openframe/core'
import { describe, expect, it } from 'vitest'

import { CSS, HUES, THEMES, channels, contrast, tk } from './design-test-support.js'

/**
 * What WCAG 2.2 AA asks of the palette and the stylesheet, WHATEVER the world.
 *
 * AA is a product commitment (PRODUCT.md), and a commitment nobody measures is
 * a wish. Every pair here is read from the real stylesheet, in every theme.
 * Nothing in this file says what the world looks like — only that it can be
 * read, found and operated. That is why it is a file of its own: a redesign
 * replaces `incumbent-world.test.ts` and leaves this one standing.
 */

const TEXT: readonly (readonly [string, string])[] = [
  ['ink', 'bg'],
  ['ink', 'page'],
  ['ink', 'panel'],
  ['ink-muted', 'panel'],
  ['ink-muted', 'bg'],
  /*
   * The home surface sets its specimen labels, timestamps and notes in muted ink
   * on page stock. It was the one surface in the product that was not the
   * ruled page, and ruling it introduced a pair nothing had measured.
   */
  ['ink-muted', 'page'],
  /* A ledger row's title on the accent wash it takes when hovered. */
  ['ink', 'accent-soft'],
  /* Knocked-out text on ink: the tool tip, and the primary action on hover. */
  ['panel', 'ink'],
  ['accent', 'panel'],
  ['accent', 'accent-soft'],
  ['danger', 'panel'],
  /*
   * The mentions bell, which is knocked-out text on the accent itself rather
   * than on the wash — a pair nothing measured until something set it.
   */
  ['panel', 'accent'],
  /* And a row of that list under the pointer, which is ink on the hover stock. */
  ['ink', 'hover'],
  /*
   * The workspace filter: a muted board count inside the selected tab's wash,
   * and the accent used as TEXT on page stock rather than as a control's
   * boundary. The accent-on-page pair is asserted below at the 3:1 control
   * floor as well — the two floors are different questions about the same
   * pair, and a label you have to read is the stricter one.
   */
  ['ink-muted', 'accent-soft'],
  ['accent', 'page'],
  /*
   * A CODE BLOCK's ground, and the language label on it.
   *
   * The block sits on `s-gray` rather than the panel, so `ink` and `ink-muted`
   * on that surface are two more pairs nothing had measured.
   */
  ['sc-ink', 'sc-s-gray'],
  ['sc-ink-muted', 'sc-s-gray'],
  /*
   * Content that carries its own surface, on the scene: text objects and
   * placeholders on the ground, tables and code on their paper. The scene has
   * its own ink and does not follow the application's theme (ADR T010).
   */
  ['sc-ink', 'sc-ground'],
  ['sc-ink-muted', 'sc-ground'],
  ['sc-ink', 'sc-panel'],
  ['sc-ink-muted', 'sc-panel'],
  ['sc-danger', 'sc-danger-wash'],
  /*
   * A guide's distance: the measurement is read, mid-drag, in the page's
   * colour on the guide's own.
   */
  ['page', 'guide'],
]

/** 1.4.11 Non-text Contrast: boundaries you must perceive to operate a control. */
const CONTROLS: readonly (readonly [string, string])[] = [
  ['control-border', 'panel'],
  ['control-border', 'page'],
  ['control-border', 'bg'],
  ['accent', 'page'],
]

describe.each(THEMES)('palette contrast — $name', ({ token }) => {
  it.each(TEXT)('%s on %s meets AA for text (4.5:1)', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(CONTROLS)('%s on %s meets AA for controls (3:1)', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })

  /*
   * The ARMED tool, read off the rule that paints it rather than listed here:
   * a pair written into this file stays green when the rule moves to another
   * one. The active tool is a filled ink bed with a page-coloured icon, and
   * the icon is what says which tool you are holding — 3:1, a graphic you
   * must perceive to operate the rail.
   */
  it('the armed tool’s icon reads on its bed (3:1)', () => {
    const rule = /\.of-tool--active[^{]*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    const fg = /(?<![\w-])color:\s*var\(--of-([\w-]+)\)/.exec(rule)?.[1]
    const bg = /(?<![\w-])background:\s*var\(--of-([\w-]+)\)/.exec(rule)?.[1]
    expect(fg, 'the active tool names its icon colour as a token').toBeDefined()
    expect(bg, 'the active tool names its bed as a token').toBeDefined()
    expect(contrast(token(fg ?? ''), token(bg ?? ''))).toBeGreaterThanOrEqual(3)
  })

  /*
   * A PRESSED toggle — snap, in the zoom cluster — draws its own boundary.
   * Its bed alone was 1.13:1 against the bar in the light theme, so only
   * the icon's colour said it was on. The ring is read off the rule, and must
   * reach 3:1 against the bar's own stock in both worlds.
   */
  it('a pressed toggle draws a boundary you can see (3:1)', () => {
    const rule = /\.of-icon-button--on\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    const ring = /box-shadow:[^;]*var\(--of-([\w-]+)\)/.exec(rule)?.[1]
    expect(ring, 'a pressed toggle rings itself in a token').toBeDefined()
    expect(contrast(token(ring ?? ''), token('page'))).toBeGreaterThanOrEqual(3)
  })

  /**
   * ...and that boundary is not a second focus ring.
   *
   * It was an accent ring all the way round, one pixel inside the focus ring's
   * accent ring two pixels outside — so a focused toggle and a pressed one
   * looked like the same state at two weights, and a focused PRESSED one wore
   * both (audit 2026-09-27). Pressed is a bar along one edge: a different
   * shape, so the two can never be read for each other.
   */
  it('a pressed toggle is marked by an edge, not by a ring', () => {
    const rule = /\.of-icon-button--on\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    const shadow = /box-shadow:([^;]*);/.exec(rule)?.[1] ?? ''
    expect(shadow, 'a pressed toggle marks itself with an inset shadow').toContain('inset')
    // An all-round ring is `inset 0 0 0 <spread>`; an edge bar has an offset.
    expect(shadow).not.toMatch(/inset\s+0\s+0\s+0\s/)
  })

  /**
   * A shape's stroke and label on its own fill.
   */
  it.each(HUES)('%s ink on its own surface meets AA for text', (name) => {
    expect(contrast(token(`sc-c-${name}`), token(`sc-s-${name}`))).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * And the pair a STICKY renders, which is a different one.
   *
   * `.of-sticky` sets its body from `s-*` and never sets a colour, so its text
   * is `ink` on the surface — the pair above is the shape pair. Both ship, and
   * until a dark theme arrived only one of them was measured: on a light page
   * every `ink`-on-surface combination passes by a mile, so the gap cost nothing
   * and stayed invisible. On a dark page it is the pair that can actually fail,
   * because `s-*` and `ink` are now both moving.
   */
  it.each(HUES)('sticky text on a %s surface meets AA for text', (name) => {
    expect(contrast(token('sc-ink'), token(`sc-s-${name}`))).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * EVERY ink on EVERY surface, because a text colour can be picked freely.
   *
   * The two suites above measure the pairs the app CHOOSES: a shape's own ink
   * on its own fill, a sticky's default ink on its surface. A text colour is the
   * user's choice, so any of the seven inks can land on any of the seven
   * surfaces, and 49 pairs ship the moment the control does. Measuring only the
   * matched pair would leave 42 combinations the product offers and nothing
   * checks.
   *
   * These all pass today — the inks were drawn to read on a light page and the
   * surfaces are pale tints of the same family — which is exactly why the control
   * could be offered whole rather than with some combinations withheld. It is
   * also why this has to be a test: nothing about the palette FORCES it, and a
   * later ink chosen for its own sake would break it silently.
   */
  it.each(HUES.flatMap((ink) => HUES.map((surface) => [ink, surface] as const)))(
    '%s text on a %s surface meets AA for text',
    (ink, surface) => {
      expect(contrast(token(`sc-c-${ink}`), token(`sc-s-${surface}`))).toBeGreaterThanOrEqual(4.5)
    },
  )

  /**
   * And on the two grounds text can sit on without a surface under it: a frame's
   * title hangs above the frame on the page, and a connector's label rides
   * the line over the board itself.
   */
  it.each(HUES)('%s text on the board meets AA for text', (ink) => {
    expect(contrast(token(`sc-c-${ink}`), token('sc-ground'))).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * THE TWO THAT MEAN THEMSELVES.
   *
   * Black and white have one value for ink and paper, so the hue grid cannot
   * hold them: white ink on white paper is 1:1 and always will be. What has to
   * be true instead is that the pairs the interface can actually PRODUCE are
   * readable — and it only ever produces them through `readableInkOn`, which
   * answers white for a black fill and black for a white fill.
   *
   * Asserted here rather than trusted, because the two values live in the
   * stylesheet and could drift apart from the function that pairs them.
   */
  it('reads white ink on the black surface and black ink on the white one', () => {
    expect(contrast(token('sc-c-white'), token('sc-s-black'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('sc-c-black'), token('sc-s-white'))).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * One of the two neutrals reads on every surface, in every world.
   *
   * NOT "black reads on every surface", which was the first version of this and
   * failed honestly: a dark theme's surfaces are dark, so black ink on a night-green
   * surface is genuinely unreadable and asserting otherwise would have meant
   * weakening the floor to make a false claim pass.
   *
   * What is true, and is the whole guarantee behind offering black and white at
   * all, is that whichever world you are in there is always a neutral that
   * works — which is what `readableInkOn` returns without being asked. An
   * explicit choice can still be a poor one; that is the swatch row's warning
   * to give, not this suite's to prevent.
   */
  it.each(HUES)('leaves a readable neutral for the %s surface', (hue) => {
    const surface = token(`sc-s-${hue}`)
    const best = Math.max(
      contrast(token('sc-c-black'), surface),
      contrast(token('sc-c-white'), surface),
    )
    expect(best).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * SYNTAX HIGHLIGHTING, measured like any other text.
   *
   * The highlighter ships themes of hard-coded hex values; using one would put
   * six more colours outside the token system, invisible to this test and
   * wrong in one of the two palettes. Its classes are mapped to this product's
   * content colours instead, and every one of them is read against the code
   * block's surface — including in the dark theme, where they move.
   */
  it.each(['violet', 'green', 'orange', 'blue', 'gray', 'red'])(
    'code highlighted in %s is readable on the code surface',
    (name) => {
      expect(contrast(token(`sc-c-${name}`), token('sc-s-gray'))).toBeGreaterThanOrEqual(4.5)
    },
  )

  /**
   * Presence hues identify PEOPLE, and three things have to be true of them.
   */
  describe('the presence palette', () => {
    const HUES = [1, 2, 3, 4, 5, 6].map((n) => `p-${String(n)}`)

    /** A cursor is a UI component you must perceive to use — 1.4.11's floor. */
    it.each(HUES)('%s is visible on the page and on a panel', (hue) => {
      expect(contrast(token(hue), token('page'))).toBeGreaterThanOrEqual(3)
      expect(contrast(token(hue), token('panel'))).toBeGreaterThanOrEqual(3)
    })

    /**
     * Six people are told apart by hue and nothing else, so this is the one
     * separation with no other signal backing it up.
     */
    it('keeps six people distinguishable from one another', () => {
      for (const [i, a] of HUES.entries()) {
        for (const b of HUES.slice(i + 1)) {
          const [ar, ag, ab] = channels(token(a))
          const [br, bg, bb] = channels(token(b))
          expect(
            Math.hypot(ar - br, ag - bg, ab - bb),
            `${a} and ${b} are too close to tell apart`,
          ).toBeGreaterThan(60)
        }
      }
    })

    /**
     * And clear of the three hues that MEAN something. A looser threshold than
     * above, deliberately: a remote selection is dashed and carries a name tag,
     * so hue is not the only thing distinguishing it from your own — which is
     * what lets the palette have six usable members at all.
     */
    it.each(['accent', 'guide', 'danger'])('stays clear of %s', (reserved) => {
      const [rr, rg, rb] = channels(token(reserved))
      for (const hue of HUES) {
        const [hr, hg, hb] = channels(token(hue))
        expect(
          Math.hypot(hr - rr, hg - rg, hb - rb),
          `${hue} could be mistaken for ${reserved}`,
        ).toBeGreaterThan(45)
      }
    })

    /*
     * A face's INITIAL is text on the person's hue, so it takes the text floor
     * — in the page's or the panel's colour, never in ink, which reads at
     * 1.5–3:1 on these hues. The mention menu's faces were set in ink.
     */
    it.each(HUES)('%s carries a readable initial', (hue) => {
      expect(contrast(token('page'), token(hue))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(token('panel'), token(hue))).toBeGreaterThanOrEqual(4.5)
    })
  })
})

/**
 * The Twelve Pixel Floor (DESIGN.md, CLAUDE.md rule 22).
 *
 * Nothing a user must read is set below 12px — shortcuts, field labels,
 * readouts, counts. The floor was written down at 12 while 27 rules sat at 11,
 * because a floor that lives only in prose is a floor nothing measures.
 *
 * Relative sizes (`em`) are the rich-text scale inside an object and belong to
 * the user's content, so only absolute pixel sizes are read here.
 */
describe('the twelve pixel floor', () => {
  const FLOOR = 12
  /*
   * No exemptions. There was one — the record panel's size choice drew each
   * step at its own size, so "small" was a specimen of 10px type — and it
   * went with the control when a connector's label became rich text
   * (ADR 0014).
   */
  /**
   * Sizes are ramp tokens now, so the floor has to READ the ramp — a check
   * that only looked at literal `px` would pass on a stylesheet with no
   * literals left in it, whatever the ramp said.
   */
  const RAMP = new Map<string, number>()
  // In px at the default 16px root: the interface's steps are written in rem.
  for (const [, name = '', value = '', unit = ''] of CSS.matchAll(
    /(--of-type-[\w-]+):\s*([\d.]+)(px|rem);/g,
  )) {
    // The root's definition only: the board redefines the ramp in world
    // units, and letting that overwrite this would compare it with itself.
    if (!RAMP.has(name)) RAMP.set(name, unit === 'rem' ? Number(value) * 16 : Number(value))
  }
  const sizeOf = (value: string): number | null => {
    const token = /^var\((--of-type-[\w-]+)\)$/.exec(value)
    if (token !== null) return RAMP.get(token[1] ?? '') ?? null
    const literal = /^([\d.]+)px$/.exec(value)
    return literal === null ? null : Number(literal[1])
  }
  const rules = (): [string, string][] => {
    const source = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const found: [string, string][] = []
    for (const [, selector = '', body = ''] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const [, size = ''] of body.matchAll(/(?<![\w-])font-size:\s*([^;]+);/g)) {
        found.push([selector.trim(), size.trim()])
      }
    }
    return found
  }

  /*
   * The INTERFACE's type follows the reader's text size (audit 2026-09-27):
   * set in px, a browser's text-size preference changed nothing. Display type
   * is a text object's size — content, in world units — and stays in px, or
   * one board would lay out differently for two people looking at it.
   */
  it('sets the interface ramp in rem, and content in px', () => {
    // Each token's first definition — the root's; the board redefines its own.
    const units = new Map<string, string>()
    for (const [, name = '', unit = ''] of CSS.matchAll(/(--of-type-[\w-]+):\s*[\d.]+(px|rem);/g)) {
      if (!units.has(name)) units.set(name, unit)
    }
    expect(units.size).toBeGreaterThan(5)
    for (const [name, unit] of units) {
      expect(`${name} ${unit}`).toBe(`${name} ${name === '--of-type-display' ? 'px' : 'rem'}`)
    }
  })

  /*
   * ...but inside the board it is content, and set in world units: the same
   * steps, in px, on `.of-world`. Held equal, so the two never drift apart.
   */
  it('gives the board the same ramp in world units', () => {
    const world = /\.of-world\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    const inWorld = new Map(
      [...world.matchAll(/(--of-type-[\w-]+):\s*([\d.]+)px;/g)].map(([, name = '', px = '']) => [
        name,
        Number(px),
      ]),
    )
    const interfaceSteps = [...RAMP].filter(([name]) => name !== '--of-type-display')
    expect(interfaceSteps.length).toBeGreaterThan(5)
    for (const [name, px] of interfaceSteps)
      expect(`${name} ${String(inWorld.get(name))}`).toBe(`${name} ${String(px)}`)
  })

  it('sets no functional text below 12px', () => {
    const below = rules()
      .filter(([, size]) => {
        const px = sizeOf(size)
        return px !== null && px < FLOOR
      })
      .map(([selector, size]) => `${selector}: ${size}`)
    expect(below).toEqual([])
  })

  it('puts no step of the ramp below the floor', () => {
    expect(RAMP.size).toBeGreaterThan(0)
    expect([...RAMP].filter(([, px]) => px < FLOOR)).toEqual([])
  })

  /**
   * The ramp (DESIGN.md, Typography). 114 of 122 sizes were raw pixels, in
   * nine values, so "the type scale" was whichever number the last rule
   * happened to use. Every interface size now names a step; content inside an
   * object scales in `em` from its object and is not on the ramp.
   */
  it('draws every interface size from the ramp', () => {
    const off = rules()
      /*
       * `em`, not anything ending in it: `endsWith('em')` let `rem` through,
       * and an interface size in rem off the ramp sat in the emoji library
       * unnoticed (audit 2026-10-08).
       */
      .filter(([, size]) => !/^var\(--of-type-[\w-]+\)$/.test(size) && !/^[\d.]+em$/.test(size))
      .map(([selector, size]) => `${selector}: ${size}`)
    expect(off).toEqual([])
  })
})

/**
 * The icon button. Six private versions at four sizes became one, and the
 * ones under 30px were under this world's target for a secondary control.
 * Nothing may bring a private one back beside it at a smaller size.
 */
describe('one icon button', () => {
  it('holds the secondary target at its smallest', () => {
    const rule = /\.of-icon-button \{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(rule).toContain('min-width: var(--of-hit-sm);')
    expect(rule).toContain('height: var(--of-hit-sm);')
  })
})

/*
 * A narrow window drops the save state's word to make room — but never a
 * FAILURE. `display: none` also takes the live region out of the tree, so a
 * phone-width window was the one place a failed save said nothing at all.
 */
describe('a failed save survives a narrow window', () => {
  it('lets a short bar hide only the quiet readout, never a failure or an offline room', () => {
    const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    // Every rule anywhere that hides part of the readout.
    const hides = [...css.matchAll(/([^{}]*of-status__save[^{}]*)\{[^}]*display:\s*none/g)].map(
      (m) => (m[1] ?? '').trim(),
    )
    expect(hides.length, 'the rules are found, so this is not vacuous').toBeGreaterThan(0)
    for (const selector of hides) {
      // The quiet tone whole, or the second half of a reading — "· saved here".
      expect(selector).toMatch(/\.of-status__save--quiet$|\.of-status__save-more$/)
    }
  })
})

/*
 * Which colour each face's initial is SET in. The token pairs above say page
 * and panel are readable on every hue; this says those are what is used.
 */
describe('face initials', () => {
  it.each(['of-status__person', 'of-comment__who', 'of-mention-menu__face'])(
    '.%s sets its initial in page or panel colour',
    (face) => {
      const rule = new RegExp(`\\.${face}\\s*\\{([^}]*)\\}`).exec(CSS)
      expect(rule, `.${face} rule`).not.toBeNull()
      const colour = /(?:^|[;\s])color:\s*([^;]+);/.exec(rule?.[1] ?? '')?.[1]?.trim()
      expect(['var(--of-page)', 'var(--of-panel)']).toContain(colour)
    },
  )
})

/*
 * The selection, the snap guides and a route's legs are thin lines of one
 * colour, drawn over whatever is on the board. On their own they vanished
 * where they were needed: the accent was 2.2:1 on a black note in the
 * light theme, 1.7:1 on a white one in the dark theme, and 1.0–1.2:1 against every
 * coloured connector — a line's legs disappeared into the line (C3 #7).
 *
 * So each one carries a HALO in the page's colour, and the pair is measured:
 * on every ground a line can be drawn over — the page, every surface and every
 * ink — either the line or its halo clears 3:1, and the line clears 3:1
 * against its own halo, so wherever the halo shows, the line shows on it.
 * Read off the rules, so a halo that is removed or recoloured fails here.
 */
describe.each(THEMES)('the apparatus reads on anything — $name', ({ token }) => {
  const LINES: readonly { readonly rule: string; readonly ink: RegExp }[] = [
    { rule: '.of-selection', ink: /(?<![\w-])outline:[^;]*var\(--((?:of|sc)-[\w-]+)\)/ },
    { rule: '.of-guide', ink: /(?<![\w-])background:\s*var\(--((?:of|sc)-[\w-]+)\)/ },
    { rule: '.of-endpoint--leg', ink: /(?<![\w-])background:[^;]*var\(--((?:of|sc)-[\w-]+)\)/ },
    // A table's selected cell: its ring sat on the grid lines and got lost.
    { rule: '.of-table-ring', ink: /(?<![\w-])border:[^;]*var\(--((?:of|sc)-[\w-]+)\)/ },
  ]
  // Apparatus is drawn over the SCENE, so its grounds are the scene's.
  const GROUNDS = [
    'sc-ground',
    'sc-ground-deep',
    ...COLOR_TOKENS.map((hue) => `sc-s-${hue}`),
    ...COLOR_TOKENS.map((hue) => `sc-c-${hue}`),
  ]

  describe.each(LINES)('$rule', ({ rule, ink }) => {
    const escaped = rule.replace(/[.-]/g, (c) => `\\${c}`)
    const body = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? ''
    const line = ink.exec(body)?.[1]
    const halo = /box-shadow:[^;]*var\(--((?:of|sc)-[\w-]+)\)/.exec(body)?.[1]

    it('names its colour and its halo as tokens', () => {
      expect(line, `${rule} names its colour`).toBeDefined()
      expect(halo, `${rule} carries a halo`).toBeDefined()
    })

    it('shows on its own halo (3:1)', () => {
      expect(contrast(token(tk(line ?? '')), token(tk(halo ?? '')))).toBeGreaterThanOrEqual(3)
    })

    it.each(GROUNDS)('shows, or its halo does, over %s (3:1)', (ground) => {
      const best = Math.max(
        contrast(token(tk(line ?? '')), token(ground)),
        contrast(token(tk(halo ?? '')), token(ground)),
      )
      expect(best).toBeGreaterThanOrEqual(3)
    })
  })
})

/** Every file under `views/table/`, which is where a table is drawn. */
function tableParts(): string[] {
  return readdirSync(resolve(process.cwd(), 'src/views/table'))
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => `src/views/table/${file}`)
}

/*
 * An object's EDGE is how you find it on the board, so it is a graphic you
 * must perceive — 3:1 against what it sits on (PRODUCT.md's open gap, closed
 * in C3 #8). A white shape in the light theme was 1.06:1 on the page and a black
 * one in the dark theme 1.14:1; the frame's edge was 1.45:1; a table's inner grid
 * 1.20:1 on its own ground. Read off the rule and the view that draw them, so
 * an edge moved back onto a quieter token fails here.
 */
describe.each(THEMES)('edges that never vanish — $name', ({ token }) => {
  // The table's view and the parts it is drawn from.
  const TABLE = ['src/views/TableView.tsx', ...tableParts()]
    .map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'))
    .join('\n')

  it.each(['line-black', 'line-white'])('a %s stroke shows on the ground', (line) => {
    expect(contrast(token(`sc-${line}`), token('sc-ground'))).toBeGreaterThanOrEqual(3)
    expect(contrast(token(`sc-${line}`), token('sc-ground-deep'))).toBeGreaterThanOrEqual(3)
  })

  // PRODUCT.md's recorded gap: a fresh shape's outline on its own default fill.
  it("a default shape's outline shows on its fill and on the page", () => {
    expect(contrast(token('sc-c-gray'), token('sc-s-gray'))).toBeGreaterThanOrEqual(3)
    expect(contrast(token('sc-c-gray'), token('sc-ground'))).toBeGreaterThanOrEqual(3)
  })

  it("a frame's edge shows on the page", () => {
    const body = /\.of-frame__edge\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    const edge = /(?<![\w-])border:[^;]*var\(--((?:of|sc)-[\w-]+)\)/.exec(body)?.[1] ?? ''
    expect(contrast(token(tk(edge)), token('sc-ground'))).toBeGreaterThanOrEqual(3)
  })

  it("a table's lines show on its ground, inside and out", () => {
    const resolve = /function resolveLine[\s\S]*?\n}/.exec(TABLE)?.[0] ?? ''
    const [outer, inner] = [...resolve.matchAll(/'var\(--((?:of|sc)-[\w-]+)\)'/g)].map(
      (m) => m[1] ?? '',
    )
    expect(outer, 'the outer line names a token').toBeDefined()
    expect(inner, 'the inner line names a token').toBeDefined()
    expect(contrast(token(tk(outer ?? '')), token('sc-panel'))).toBeGreaterThanOrEqual(3)
    expect(contrast(token(tk(inner ?? '')), token('sc-panel'))).toBeGreaterThanOrEqual(3)
  })
})

/*
 * A frame's default paper is a surface text and objects sit on, and its edge is
 * how you find it: it takes the scene's control border, which must show on it
 * (3:1). The paper is scene content, so it is the same in every theme.
 */
describe("a frame's paper edge", () => {
  const block = [...CSS.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1] ?? '').join('\n')
  const paper = /--sc-frame-paper:\s*var\(--((?:of|sc)-[\w-]+)\)/.exec(block)?.[1]

  it.each(THEMES)('shows its edge (3:1) — $name', ({ token }) => {
    expect(paper, 'the frame paper names the stock it is').toBeDefined()
    expect(contrast(token('sc-control-border'), token(tk(paper ?? '')))).toBeGreaterThanOrEqual(3)
  })
})

describe('an empty text', () => {
  const rule = (selector: string): string =>
    new RegExp(`${selector.replace(/[.-]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ??
    ''

  // A placeholder is text somebody has to read to know what to do: 4.5:1.
  it("an empty text's placeholder is muted ink, not a faded one", () => {
    const body = rule('.of-text--empty')
    expect(body).not.toMatch(/opacity/)
    expect(body).toMatch(/(?<![\w-])color:\s*var\(--sc-ink-muted\)/)
  })
})

/*
 * The home surface, the account and the share controls (C3 #9). Every boundary
 * one of them DRAWS is a boundary somebody has to see to find the control, so
 * it clears 3:1 on the page and on the panel it may sit on. They were drawn in
 * the panel hairline or a wash, at 1.1–1.8:1: an edge that was there and did
 * nothing. Controls that draw no boundary at all are identified by their words.
 */
describe.each(THEMES)('the home surface’s controls are seen — $name', ({ token }) => {
  // Every rule the selector ends, joined: a shared rule comes first and a
  // selector's own declarations after it.
  const rule = (selector: string): string =>
    [
      ...CSS.matchAll(
        new RegExp(`${selector.replace(/[.-]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`, 'g'),
      ),
    ]
      .map((match) => match[1] ?? '')
      .join('\n')

  it.each([
    '.of-status__share',
    '.of-home__confirm-yes',
    '.of-comment__confirm-yes',
    '.of-home__confirm-no',
    '.of-mentions__bell',
    '.of-spaces__tab--on',
  ])('%s draws its edge at 3:1', (selector) => {
    const edge = /(?<![\w-])border:[^;]*var\(--of-([\w-]+)\)/.exec(rule(selector))?.[1]
    expect(edge, `${selector} draws a border in a token`).toBeDefined()
    expect(contrast(token(edge ?? ''), token('page'))).toBeGreaterThanOrEqual(3)
    expect(contrast(token(edge ?? ''), token('panel'))).toBeGreaterThanOrEqual(3)
  })

  // An unpinned pin is a control that is always there, so its glyph is seen.
  it('an unpinned pin is drawn at 3:1, not faded', () => {
    const body = rule('.of-home__pin')
    expect(body).not.toMatch(/opacity/)
    const ink = /(?<![\w-])color:\s*var\(--of-([\w-]+)\)/.exec(body)?.[1]
    expect(ink, 'the pin names its colour').toBeDefined()
    expect(contrast(token(ink ?? ''), token('panel'))).toBeGreaterThanOrEqual(3)
  })
})

describe('the home surface’s targets', () => {
  it('"Create an account" is a whole target, not a 23px line of text', () => {
    const body = /\.of-account__switch\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(body).toMatch(/min-height:\s*var\(--of-hit-sm\)/)
  })
})

/*
 * A POLL'S CONTROLS are drawn on the card's own paper, in any colour the card
 * is given, in either world (audit 2026-10-08). Their edges were a chrome
 * token, `--of-control-border`, measured against the panel and never against
 * a card: 2.26:1 on the default card in the dark theme and under 3:1 on seven card
 * colours in the light theme. An edge drawn from the card's own ink follows
 * whatever paper it is on, and this measures it on every one.
 *
 * The share is read from the stylesheet, and the edge composited over the
 * paper exactly as `color-mix(in srgb, currentcolor N%, transparent)` is.
 */
describe.each(THEMES)("a poll's controls — $name", ({ token }) => {
  const share = (selector: string): number => {
    const body = new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? ''
    const found = /border:[^;]*color-mix\(in srgb, currentcolor (\d+)%, transparent\)/.exec(body)
    expect(found, `${selector} draws its edge from the card's ink`).not.toBeNull()
    return Number(found?.[1] ?? 0) / 100
  }
  const over = (ink: string, paper: string, amount: number): string => {
    const [ir, ig, ib] = channels(ink)
    const [pr, pg, pb] = channels(paper)
    const mix = (i: number, p: number) => Math.round(i * amount + p * (1 - amount))
    const hex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${hex(mix(ir, pr))}${hex(mix(ig, pg))}${hex(mix(ib, pb))}`
  }
  // The pairs the card can be drawn in: what `readableInkOn` gives a neutral
  // card, and the board's ink on every hue.
  const cards: readonly (readonly [string, string, string])[] = [
    ['white', token('sc-s-white'), token('sc-c-black')],
    ['black', token('sc-s-black'), token('sc-c-white')],
    ...HUES.map((hue) => [hue, token(`sc-s-${hue}`), token('sc-ink')] as const),
  ]

  it.each(['of-poll__option', 'of-poll__close'])('%s shows on every card (3:1)', (selector) => {
    const amount = share(selector)
    const faint = cards
      .map(([name, paper, ink]) => [name, contrast(over(ink, paper, amount), paper)] as const)
      .filter(([, ratio]) => ratio < 3)
    expect(faint).toEqual([])
  })
})

/*
 * ONE PRESSED BUTTON (audit 2026-10-08). `.of-button` had no pressed state,
 * so four surfaces made their own: the vote tool, the timer's presets, the
 * music genres and Mute. Three were the all-round accent ring that the icon
 * button gave up for a foot bar because a ring is what focus draws; Mute was
 * its text colour alone, 1.14:1. The primitive carries the state now, and no
 * surface paints pressed or chosen with a ring of its own.
 */
describe('one pressed button', () => {
  it('marks a pressed or chosen button with an edge along its foot', () => {
    const rule =
      /\.of-button\[aria-pressed='true'\],\s*\.of-button\[aria-checked='true'\]\s*\{([^}]*)\}/.exec(
        CSS,
      )?.[1] ?? ''
    expect(rule, 'the primitive marks pressed and chosen').not.toBe('')
    const shadow = /box-shadow:([^;]*);/.exec(rule)?.[1] ?? ''
    expect(shadow).toContain('inset')
    expect(shadow).not.toMatch(/inset\s+0\s+0\s+0\s/)
  })

  it('leaves no surface its own ring for pressed or chosen', () => {
    const rings = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, selector = '']) => /\[aria-(pressed|checked)='true'\]/.test(selector))
      .filter(([, , body = '']) => /border-color:\s*var\(--of-accent\)/.test(body))
      .map(([, selector = '']) => selector.replace(/\/\*[\s\S]*?\*\//g, '').trim())
      /*
       * A reaction chip is a capsule on a note, in the world: its edge is the
       * only boundary it has, and a bar under a pill reads as an underline.
       * Focus is drawn outside it, so the two cannot be read for each other.
       */
      .filter((selector) => selector !== ".of-reaction[aria-pressed='true']")
    expect(rings).toEqual([])
  })
})
