/** Shared responsive class fragments for desktop layout (Tailwind `lg` = 1024px). */

/** Hide on desktop — mobile-only elements (bottom nav, hamburger, drawer backdrop). */
export const mobileOnlyClass = 'lg:hidden'

/** Show only on desktop. */
export const desktopOnlyClass = 'hidden lg:flex'

/** Multi-column list/card grids for feature pages. */
export const listPageGridClass =
  'lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 [&_.list-card]:mb-0'

/** Dashboard stat cards — wider layout on desktop. */
export const statGridDesktopClass = 'lg:gap-3 xl:grid-cols-4'

/** Records page — filters sidebar + list on desktop. */
export const recordsPageDesktopClass =
  'lg:grid lg:grid-cols-[minmax(17rem,1fr)_minmax(0,2fr)] lg:items-start lg:gap-5'

/** Settings / form pages — two-column sections on wide screens. */
export const settingsPageDesktopClass = 'lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start'

/** Calculator / tool pages — centered wider content. */
export const toolsPageDesktopClass = 'lg:max-w-3xl lg:mx-auto lg:w-full'

/** Report pages — chart + table side by side when space allows. */
export const reportPageDesktopClass = 'lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start'
