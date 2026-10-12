import { createContext, useContext } from 'react'

/** Desktop header containers pages can render into (see `DesktopHeaderPortal`). */
export interface HeaderSlots {
  /** After the title: the period chip, active filter chips. */
  toolbar: HTMLElement | null
  /** End of the row: the page's speed-dial actions as buttons. */
  actions: HTMLElement | null
  /** End of the row on every width: a page's own header button (bank SMS ⚙). */
  pageEnd: HTMLElement | null
}

export const HeaderSlotsContext = createContext<HeaderSlots>({
  toolbar: null,
  actions: null,
  pageEnd: null
})

export function useHeaderSlots(): HeaderSlots {
  return useContext(HeaderSlotsContext)
}
