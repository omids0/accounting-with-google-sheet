import { useMemo, useState } from 'react'

import ConflictDiff from './ConflictDiff'
import { useSharing } from '../../hooks/useSharing'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { diffCells, rowSummary, type RowConflict } from '../../services/rowConflict'
import {
  conflictHeaders,
  conflictTitle,
  keepMyVersion,
  keepTheirVersion,
  listRowConflicts
} from '../../services/rowConflictResolve'
import { getActiveSpreadsheetId } from '../../services/sheetSync'
import { normalizeDigits, toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import FormModal from '../FormModal'
import {
  appLockPolicyListClass,
  appLockPolicyOptionClass,
  appLockPolicyOptionDescriptionClass,
  appLockPolicyOptionLabelClass,
  appLockPolicyOptionMainClass,
  appLockPolicyOptionRadioClass
} from '../ui/appLockStyles'
import { conflictNoteClass, conflictTextClass } from '../ui/conflictStyles'

type Choice = 'theirs' | 'mine'

/** «۱۴:۰۲» from a sheet time cell such as «۱۴۰۵/۷/۲۱, ۱۴:۰۲:۰۰». */
function timeOf(cell: string): string {
  const match = /(\d{1,2}):(\d{2})/.exec(normalizeDigits(cell))

  return match ? toPersianDigits(`${match[1]}:${match[2]}`) : ''
}

function Option({
  selected,
  label,
  summary,
  onSelect
}: {
  selected: boolean
  label: string
  summary: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={appLockPolicyOptionClass(selected)}
      onClick={onSelect}
    >
      <span className={appLockPolicyOptionMainClass}>
        <span className={appLockPolicyOptionLabelClass}>{label}</span>
        <span className={appLockPolicyOptionRadioClass(selected)} aria-hidden="true">
          {selected && <AppIcon name="check" size={10} />}
        </span>
      </span>
      {summary ? <span className={appLockPolicyOptionDescriptionClass}>{summary}</span> : null}
    </button>
  )
}

function ConflictChoice({
  spreadsheetId,
  conflict,
  onClose
}: {
  spreadsheetId: string
  conflict: RowConflict
  onClose: () => void
}) {
  const { label } = useSharing()
  const [choice, setChoice] = useState<Choice>('theirs')
  const [showAll, setShowAll] = useState(false)
  const headers = conflictHeaders(spreadsheetId, conflict.sheetName)
  const theirName = label(conflict.theirEmail).name
  const title = conflictTitle(spreadsheetId, conflict)
  const theirTime = timeOf(conflict.theirAt)
  const myTime = timeOf(conflict.mineAt ?? '')

  const keep = () => {
    if (choice === 'theirs') keepTheirVersion(spreadsheetId, conflict)
    else keepMyVersion(spreadsheetId, conflict, theirName)
  }

  return (
    <FormModal
      open
      variant="panel"
      title="این رکورد هم‌زمان عوض شده"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        keep()
      }}
      saveLabel="نگه دار"
      cancelLabel={showAll ? 'بستن مقایسه' : 'هر دو را ببین'}
      onCancel={() => setShowAll(value => !value)}
    >
      <p className={conflictTextClass}>
        {`«${title}» را تو و ${theirName} هر دو ویرایش کردید. کدام بماند؟`}
      </p>
      <div className={appLockPolicyListClass} role="radiogroup" aria-label="نسخهٔ ماندنی">
        <Option
          selected={choice === 'theirs'}
          label={[`نسخهٔ ${theirName}`, theirTime].filter(Boolean).join(' · ')}
          summary={rowSummary(headers, conflict.theirs)}
          onSelect={() => setChoice('theirs')}
        />
        <Option
          selected={choice === 'mine'}
          label={['نسخهٔ من', myTime].filter(Boolean).join(' · ')}
          summary={rowSummary(headers, conflict.mine)}
          onSelect={() => setChoice('mine')}
        />
      </div>
      {showAll ? (
        <ConflictDiff
          diffs={diffCells(headers, conflict.mine, conflict.theirs)}
          theirName={theirName}
        />
      ) : null}
      <p className={conflictNoteClass}>
        نسخه‌ای که نماند در «فعالیت» ثبت می‌شود. تا انتخاب نکنی، این تغییر به شیت فرستاده نمی‌شود.
      </p>
    </FormModal>
  )
}

/** One conflict at a time, oldest first; never resolved on its own. */
export default function ConflictSheet({ onClose }: { onClose: () => void }) {
  const { conflicts: count } = useSyncStatus()
  const spreadsheetId = getActiveSpreadsheetId() ?? ''
  const conflict = useMemo(
    () => (spreadsheetId && count ? listRowConflicts(spreadsheetId)[0] : undefined),
    [count, spreadsheetId]
  )

  if (!conflict) return null

  return (
    <ConflictChoice
      key={conflict.entryId}
      spreadsheetId={spreadsheetId}
      conflict={conflict}
      onClose={onClose}
    />
  )
}
