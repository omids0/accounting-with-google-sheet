import { useMemo, useState } from 'react'

import SharedRecordRow from './SharedRecordRow'
import SharedViewerBanner from './SharedViewerBanner'
import { matchesPerson } from './sharedViewModel'
import { useSharedRecords } from './useSharedRecords'
import { useSharedSheets } from './useSharedSheets'
import { isConfigured } from '../../services/settings'
import FilterChipBar from '../buildings/FilterChipBar'
import EmptyState from '../EmptyState'
import { RecordListSkeleton } from '../skeleton'
import Card from '../ui/Card'
import { sharedListClass, sharedPageClass } from '../ui/sharedStyles'

/**
 * «ثبت‌ها» of the shared account: every record but the settlements, newest first, filtered to
 * everyone or one person (who paid; an income by who recorded it). A tap opens the record sheet.
 */
export default function SharedRecordsPage() {
  const shared = useSharedRecords()
  const sheets = useSharedSheets(shared)
  const [person, setPerson] = useState('all')

  const shown = useMemo(
    () => shared.entries.filter(record => matchesPerson(record.values, person)),
    [shared.entries, person]
  )

  if (!isConfigured()) return <EmptyState icon="records" message="ابتدا با گوگل وارد شوید" />

  if (shared.loading && !shared.entries.length) return <RecordListSkeleton />

  const people = shared.pair ?? []

  return (
    <div className={sharedPageClass}>
      {shared.role === 'viewer' ? <SharedViewerBanner /> : null}

      {people.length ? (
        <FilterChipBar
          ariaLabel="ثبت‌های چه کسی"
          value={person}
          onChange={setPerson}
          options={[
            { value: 'all', label: 'همه' },
            ...people.map(email => ({ value: email, label: shared.nameOf(email) }))
          ]}
        />
      ) : null}

      {shown.length ? (
        <Card>
          <div className={sharedListClass}>
            {shown.map((record, index) => (
              <SharedRecordRow
                key={record.id}
                record={record}
                shared={shared}
                index={index}
                onOpen={sheets.openRecord}
              />
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="empty-inbox"
          message={shared.entries.length ? 'ثبتی پیدا نشد' : 'هنوز ثبتی نیست'}
          description={
            shared.access.canRecord && !shared.entries.length
              ? 'با دکمهٔ شناور اولین هزینهٔ مشترک را ثبت کنید.'
              : undefined
          }
        />
      )}

      {sheets.overlays}
    </div>
  )
}
