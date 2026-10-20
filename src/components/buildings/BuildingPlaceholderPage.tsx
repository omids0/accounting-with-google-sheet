import { useLocation } from 'react-router'

import { getTabFromPath } from '../../routes/paths'
import EmptyState from '../EmptyState'
import { TAB_TITLES } from '../layout/types'

/** Stands in for a building page that a later step of round 11 replaces. */
export default function BuildingPlaceholderPage() {
  const { pathname } = useLocation()

  return (
    <EmptyState
      icon="building"
      message={`${TAB_TITLES[getTabFromPath(pathname)]} · به‌زودی`}
      description="این بخش از مدیر ساختمان هنوز آماده نیست."
    />
  )
}
