export type MapVisualTheme = 'light' | 'dark'

export type MapThemePreference = 'auto' | MapVisualTheme

export type MapTileLayerConfig = {
  url: string
  attribution: string
}

/** Free OSM tiles — Carto basemaps now require an API key and show a watermark without one. */
export const MAP_TILE_LAYER: MapTileLayerConfig = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}

export const MAP_DEFAULT_HEIGHT = '17.5rem'

export function resolveMapVisualTheme(
  preference: MapThemePreference,
  appTheme: MapVisualTheme
): MapVisualTheme {
  return preference === 'auto' ? appTheme : preference
}

export function nextMapThemePreference(current: MapThemePreference): MapThemePreference {
  if (current === 'auto') return 'dark'
  if (current === 'dark') return 'light'

  return 'auto'
}

export function mapThemePreferenceLabel(
  preference: MapThemePreference,
  effective: MapVisualTheme
): string {
  if (preference === 'auto') {
    return effective === 'dark' ? 'شب (خودکار)' : 'روز (خودکار)'
  }

  return preference === 'dark' ? 'شب' : 'روز'
}
