import { useNavigate, useParams } from 'react-router'

import { LazyDangSplitDetailPage } from './lazyPages'
import type { DangSplitGroupWithRow } from '../components/dangSplit/types'
import { DangCardListSkeleton } from '../components/skeleton'
import Button from '../components/ui/Button'
import { emptyStateClass } from '../components/ui/displayStyles'
import { useRouteRecord } from '../hooks/useRouteRecord'

async function fetchGroups(spreadsheetId: string): Promise<DangSplitGroupWithRow[]> {
  const { ensureDangSplitSheets, fetchDangSplitGroups } = await import('../services/dangSplit')

  await ensureDangSplitSheets(spreadsheetId)

  return fetchDangSplitGroups(spreadsheetId)
}

export default function DangSplitDetailRoute() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { record: group, loading } = useRouteRecord(groupId, fetchGroups)

  if (loading) {
    return <DangCardListSkeleton />
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
