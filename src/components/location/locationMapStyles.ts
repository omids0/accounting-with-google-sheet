import { cn } from '../../utils/cn'

export const locationMapShellClass = cn(
  'location-map-shell grid gap-3 rounded-[calc(var(--radius)+2px)] border border-[color-mix(in_srgb,var(--color-primary)_18%,var(--color-border))] p-3',
  '[background:linear-gradient(165deg,color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))_0%,var(--color-surface)_52%,color-mix(in_srgb,var(--color-accent-soft)_70%,var(--color-surface))_100%)]',
  'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
)

export const locationMapFrameClass = cn(
  'location-map-frame relative overflow-hidden rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_color-mix(in_srgb,var(--color-primary)_12%,transparent)]',
  '[&_.leaflet-container]:z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:min-h-[17.5rem] [&_.leaflet-container]:bg-[color-mix(in_srgb,var(--color-accent-soft)_55%,var(--color-surface))]'
)

export const locationMapOverlayClass =
  'pointer-events-none absolute inset-x-0 top-0 z-[401] h-16 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_16%,transparent)_0%,transparent_100%)]'

export const locationMapThemeToggleClass = cn(
  'inline-flex min-h-touch-min shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-primary)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-2.5 py-1.5 text-[0.72rem] font-bold text-primary-dark shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-[transform,background,border-color] duration-[var(--duration-fast)]',
  'hover:enabled:-translate-y-px hover:enabled:border-primary-light hover:enabled:bg-surface',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:ring-offset-2'
)

export const locationMapToolbarClass =
  'flex flex-wrap gap-2 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_45%,var(--color-surface))] p-2'

export const locationMapStatusClass = cn(
  'rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))] px-3 py-2 text-[0.78rem] leading-[1.55] text-[color-mix(in_srgb,var(--text)_78%,transparent)]'
)

export const locationMapCoordsClass =
  'inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] px-2 py-0.5 font-[var(--font-numeric)] text-[0.74rem] text-primary-dark'

export const locationMapSearchWrapClass = cn(
  'relative rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-accent-soft))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
)

export const locationMapSearchInputClass = cn(
  'w-full rounded-[calc(var(--radius-sm)-2px)] border-[1.5px] border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))] bg-[var(--form-input-bg)] px-10 py-2.5 font-[inherit] text-[0.84rem] text-text shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow,background,transform] duration-[var(--duration-normal)]',
  'placeholder:text-muted placeholder:opacity-80',
  'focus:border-primary-light focus:bg-surface focus:shadow-[var(--form-input-focus-shadow)] focus:outline-none focus:-translate-y-px'
)

export const locationMapSearchResultsClass =
  'absolute inset-x-0 top-[calc(100%+0.35rem)] z-30 max-h-44 overflow-y-auto rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-border))] bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.16)]'
