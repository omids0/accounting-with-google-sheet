import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { toPersianDigits } from '../../utils/normalizeDigits'

/** «واحد ۴»: the header title of a unit page, whichever way the page was reached. */
export const unitPageTitle = (number: string) => `واحد ${toPersianDigits(number)}`

/**
 * The header takes a detail page's title from the router state. A unit page is opened from many
 * places (list, reports, search, a shared link), so once the unit is known the page puts its own
 * title into the current history entry instead of every caller passing it.
 */
export function useUnitPageTitle(number: string | undefined) {
  const location = useLocation()
  const navigate = useNavigate()
  const title = number ? unitPageTitle(number) : ''
  const current = (location.state as { title?: string } | null)?.title

  useEffect(() => {
    if (title && current !== title) {
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: { title }
      })
    }
  }, [title, current, location.pathname, location.search, location.hash, navigate])
}
