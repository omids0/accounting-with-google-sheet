import { TAB_TITLES } from '../layout/types'

/** «خانه» of the shared account; the balance card and month totals arrive with Task 8. */
export default function SharedHomePage() {
  return <h2 className="text-lg font-bold text-text">{TAB_TITLES['shared-home']}</h2>
}
