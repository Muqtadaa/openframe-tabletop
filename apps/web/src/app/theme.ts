/**
 * Which theme the application is drawn in.
 *
 * Two: dark, the default, and light. They are themes of the APPLICATION only
 * (ADR T010): navigation, panels, docks and menus. The scene (the ground a
 * board is drawn on and every colour authored into it) belongs to no theme, so
 * a saved board is the same board under either.
 *
 * Opt-in on purpose, and not wired to `prefers-color-scheme`: a system setting
 * chosen for reading email at night is not a statement about how somebody wants
 * to run a table.
 */
export const THEMES = ['dark', 'light'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'dark'

const STORAGE_KEY = 'openframe:theme'

/**
 * The names OpenFrame stored before Tabletop, read as what they were: its
 * default world was light and its night world was dark.
 */
const LEGACY: Readonly<Record<string, Theme>> = { notebook: 'light', 'after-hours': 'dark' }

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isTheme(stored)) return stored
    return (stored !== null ? LEGACY[stored] : undefined) ?? DEFAULT_THEME
  } catch {
    // Private mode, blocked storage, a locked-down embed. A preference that
    // cannot be read is a preference that is simply not set.
    return DEFAULT_THEME
  }
}

/**
 * Applies a theme to the document and remembers it.
 *
 * The default carries NO attribute rather than `data-theme="dark"`, so the base
 * `:root` block stays the thing that defines it. An attribute for the default
 * would make two selectors responsible for one palette.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === DEFAULT_THEME) delete root.dataset.theme
  else root.dataset.theme = theme
  tellBrowserChrome()

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Not being able to remember the choice must never stop it taking effect.
  }
}

/**
 * Paints the browser's own chrome (a phone's address bar, some desktop tab
 * strips) in the theme's surface colour. Read from the token rather than
 * written again, so the theme stays the one place its colours are decided.
 */
function tellBrowserChrome(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const page = getComputedStyle(document.documentElement).getPropertyValue('--of-page').trim()
  // No stylesheet yet means no answer yet; leave what the document said.
  if (meta !== null && page !== '') meta.content = page
}

/** Restores the remembered theme. Called once, before the first render. */
export function restoreTheme(): Theme {
  const theme = readTheme()
  applyTheme(theme)
  return theme
}
