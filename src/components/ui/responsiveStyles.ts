/**
 * Shared responsive class fragments. Mobile < 768px; tablet `md` (768–1279px,
 * icon rail); desktop `xl` (≥ 1280px, sidebar + header actions + tables).
 */

/** Phone only — bottom nav, header hamburger, drawer backdrop. */
export const mobileOnlyClass = 'md:hidden'

/** Records page — filters sidebar + list on desktop. */
export const recordsPageDesktopClass =
  'xl:grid xl:grid-cols-[minmax(17rem,1fr)_minmax(0,2fr)] xl:items-start xl:gap-5'

/** Calculator / tool pages — centered wider content. */
export const toolsPageDesktopClass = 'md:max-w-3xl md:mx-auto md:w-full'

/** Report pages — chart + table side by side when space allows. */
export const reportPageDesktopClass = 'md:grid md:grid-cols-2 md:gap-5 md:items-start'
