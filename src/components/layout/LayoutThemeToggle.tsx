import { useCallback } from 'react'

import { useAppThemeMode } from '../../hooks/useAppThemeMode'
import type { ThemeMode } from '../../types'
import { applyTheme, updateTheme } from '../../utils/theme'
import AppIcon from '../AppIcon'
import {
  appMenuThemeBtnClass,
  appMenuThemeClass,
  appMenuThemeThumbClass
} from '../ui/sidebarMenuStyles'

export default function LayoutThemeToggle() {
  const mode = useAppThemeMode()
  const isDark = mode === 'dark'

  const setMode = useCallback(
    (next: ThemeMode) => {
      if (next === mode) return

      updateTheme(next)
      applyTheme(next)
    },
    [mode]
  )

  return (
    <div className={appMenuThemeClass} role="group" aria-label="حالت نمایش">
      <span className={appMenuThemeThumbClass(isDark)} aria-hidden="true" />
      <button
        type="button"
        className={appMenuThemeBtnClass(!isDark)}
        onClick={() => setMode('light')}
        aria-pressed={!isDark}
        aria-label="لایت مود"
        title="لایت مود"
      >
        <AppIcon name="sun" size={13} />
      </button>
      <button
        type="button"
        className={appMenuThemeBtnClass(isDark)}
        onClick={() => setMode('dark')}
        aria-pressed={isDark}
        aria-label="نایت مود"
        title="نایت مود"
      >
        <AppIcon name="moon" size={13} />
      </button>
    </div>
  )
}
