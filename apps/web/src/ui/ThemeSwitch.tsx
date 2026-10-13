import { useId, useState, type KeyboardEvent } from 'react'

import { applyTheme, readTheme, type Theme } from '../app/theme.js'
import { RADIOS, stepFocus } from '../controls/roving.js'

const THEME_CHOICES: readonly { readonly theme: Theme; readonly name: string }[] = [
  { theme: 'dark', name: 'Dark' },
  { theme: 'light', name: 'Light' },
]

/**
 * Which theme the application is drawn in, named by both of its themes.
 *
 * In the account sheet rather than on the board's bar: it is chosen once and
 * kept. Two named choices rather than a toggle, so neither is left without a name.
 */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const label = useId()
  const choose = (next: Theme): void => {
    setTheme(next)
    applyTheme(next)
  }
  const step = (event: KeyboardEvent<HTMLDivElement>): void => {
    const moved = stepFocus(event, { items: RADIOS, orientation: 'both' })
    const next = moved === null ? undefined : THEME_CHOICES[moved.index]
    if (next !== undefined) choose(next.theme)
  }
  return (
    <div className="of-theme-choice">
      <span className="of-theme-choice__label" id={label}>
        Theme
      </span>
      <div
        className="of-choice of-choice--text"
        role="radiogroup"
        aria-labelledby={label}
        data-testid="theme-switch"
        onKeyDown={step}
      >
        {THEME_CHOICES.map(({ theme: choice, name }) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={theme === choice}
            tabIndex={theme === choice ? 0 : -1}
            className={`of-choice__item${theme === choice ? ' of-choice__item--on' : ''}`}
            data-testid={`theme-${choice}`}
            onClick={() => {
              choose(choice)
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
