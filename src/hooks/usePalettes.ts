import { useSyncExternalStore } from 'react'

import { getPalettesSnapshot, subscribePalettes } from '../services/appPalette'
import type { PaletteId } from '../utils/appPalettes'

/** The palette chosen for each mode, and whether a pick still waits for the personal sheet. */
export function usePalettes(): { light: PaletteId; dark: PaletteId; pending: boolean } {
  const snapshot = useSyncExternalStore(subscribePalettes, getPalettesSnapshot, getPalettesSnapshot)
  const [light, dark, pending] = snapshot.split('|') as [PaletteId, PaletteId, string]

  return { light, dark, pending: pending === '1' }
}
