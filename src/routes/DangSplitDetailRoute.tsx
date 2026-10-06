import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { LazyDangSplitDetailPage } from './lazyPages'
import type { DangSplitGroupWithRow } from '../components/dangSplit/types'
import { DangCardListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import { ensureDangSplitSheets, fetchDangSplitGroups } from '../services/dangSplit'
import { getSettings } from '../services/settings'
import { handleSheetError } from '../utils/sheetError'

export default function DangSplitDetailRoute() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<DangSplitGroupWithRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const settings = getSettings()

      if (!settings?.spreadsheetId || !groupId) {
        if (!cancelled) setLoading(false)

        return
      }

      try {
        await ensureDangSplitSheets(settings.spreadsheetId)

        const items = await fetchDangSplitGroups(settings.spreadsheetId)

        if (!cancelled) {
          setGroup(items.find(item => item.id === groupId) ?? null)
          setLoading(false)
        }
      } catch (error) {
        handleSheetError(error)

        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [groupId])

  if (loading) {
    return <DangCardListSkeleton filterChips={0} />
  }

  if (!group) {
    return (
      <div className={emptyStateClass}>
        <p>گروه دنگ یافت نشد</p>
        <Button type="button" variant="primary" size="sm" onClick={() => navigate('/dang-split')}>
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return <LazyDangSplitDetailPage group={group} />
}
