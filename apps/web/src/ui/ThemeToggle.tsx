import { useState } from 'react'

import { applyTheme, readTheme, type Theme } from '../app/theme.js'
import { ThemeIcon } from '../controls/icons.js'

/**
 * Which theme the application is drawn in, as one pressed-or-not control: pressed
 * is light. On the Game Library, where it is the header's one setting; on a
 * board it is in the account sheet (`ThemeSwitch`), with the person rather than
 * on the board's bar.
 */
export function ThemeToggle({ className = 'of-icon-button' }: { readonly className?: string }) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const light = theme === 'light'

  return (
    <button
      type="button"
      className={className}
      aria-pressed={light}
      aria-label="Light theme"
      data-tip={light ? 'Light theme — on' : 'Light theme — off'}
      aria-description={light ? 'Light theme — on' : 'Light theme — off'}
      data-testid="theme-toggle"
      onClick={() => {
        const next: Theme = light ? 'dark' : 'light'
        setTheme(next)
        applyTheme(next)
      }}
    >
      <ThemeIcon />
    </button>
  )
}
