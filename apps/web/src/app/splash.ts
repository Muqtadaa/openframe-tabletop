/**
 * The boot splash, which lives in `index.html` rather than in a component.
 *
 * `main.tsx` opens with a top-level `await createRuntime()`, so `#root` is
 * empty until IndexedDB answers — and a React splash cannot paint during the
 * wait it exists to cover, because React is most of that wait. The markup is
 * therefore in the document itself, and this module only takes it away again.
 *
 * It is a plain sheet with one line of text, and it leaves the moment the board
 * is ready: there is no hold. A loading screen that delays loading is a joke at
 * the user's expense.
 */
const SPLASH_ID = 'of-splash'
/** `--of-quick`; the splash's own fade, written as a literal for the same reason as its colours. */
const FADE_MS = 140

function splashElement(): HTMLElement | null {
  return document.getElementById(SPLASH_ID)
}

/** Reduced motion removes the fade: the sheet simply goes. */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

function fadeOut(splash: HTMLElement): void {
  // The board becomes reachable at the moment it becomes visible, not before.
  document.getElementById('root')?.removeAttribute('inert')

  const remove = (): void => {
    splash.remove()
  }

  if (prefersReducedMotion()) {
    remove()
    return
  }

  splash.dataset.state = 'leaving'
  splash.addEventListener('transitionend', remove, { once: true })
  /*
   * `transitionend` does not fire in a background tab, and an element that is
   * never removed is an opaque sheet over the board. The timer is the one that
   * actually guarantees it goes.
   */
  setTimeout(remove, FADE_MS + 200)
}

/** Takes the splash away once the board is ready. */
export function dismissSplash(): void {
  const splash = splashElement()
  if (splash === null) return
  fadeOut(splash)
}

/**
 * Takes the splash away NOW, for a board that is not going to open. The failure
 * gets a panel of its own (`StartFailed`) rather than a line of text on the sheet.
 */
export function abandonSplash(): void {
  document.getElementById('root')?.removeAttribute('inert')
  splashElement()?.remove()
}
