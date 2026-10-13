import { create } from 'zustand'

import { setPersianDigitsEnabled } from '../utils/digitStyle'
import {
  applyDisplayPrefs,
  type DisplayPrefs,
  readDisplayPrefs,
  type TextSize,
  writeHaptics,
  writeHighContrast,
  writeReducedMotion,
  writeTextSize
} from '../utils/displayPrefs'

interface DisplayPrefsStore extends DisplayPrefs {
  setTextSize: (size: TextSize) => void
  setReducedMotion: (on: boolean) => void
  setHighContrast: (on: boolean) => void
  /** Saves the flag only; the caller reloads so every formatter picks it up. */
  setPersianDigits: (on: boolean) => void
  setHaptics: (on: boolean) => void
}

/** Settings › «نمایش»: each setter saves (per device) and applies to `<html>` at once. */
export const useDisplayPrefsStore = create<DisplayPrefsStore>((set, get) => {
  const update = (patch: Partial<DisplayPrefs>) => {
    set(patch)

    const { textSize, reducedMotion, highContrast, persianDigits, haptics } = get()

    applyDisplayPrefs({ textSize, reducedMotion, highContrast, persianDigits, haptics })
  }

  return {
    ...readDisplayPrefs(),
    setTextSize: textSize => {
      writeTextSize(textSize)
      update({ textSize })
    },
    setReducedMotion: reducedMotion => {
      writeReducedMotion(reducedMotion)
      update({ reducedMotion })
    },
    setHighContrast: highContrast => {
      writeHighContrast(highContrast)
      update({ highContrast })
    },
    setPersianDigits: persianDigits => {
      setPersianDigitsEnabled(persianDigits)
      update({ persianDigits })
    },
    setHaptics: haptics => {
      writeHaptics(haptics)
      update({ haptics })
    }
  }
})
