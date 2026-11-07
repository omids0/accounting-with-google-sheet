import {
  ACCESS_END_NOTE,
  PARENT_STATUS_HINTS,
  PARENT_STATUS_LABELS,
  parentsSummary
} from './familyCopy'
import type { ParentAccess } from '../../services/parentAccess'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import {
  buildingChipToneClass,
  journeyListClass,
  journeyNoteClass,
  journeyRowClass,
  journeyRowMetaClass
} from '../ui/buildingStyles'
import Card from '../ui/Card'
import { sharedCardTitleClass } from '../ui/sharedStyles'

const PARENT_CHIP_TONE: Record<ParentAccess['status'], string> = {
  active: buildingChipToneClass.success,
  revoked: buildingChipToneClass.danger,
  unverified: buildingChipToneClass.neutral
}

interface ParentRowsProps {
  parents: ParentAccess[]
  /** Drive has not answered yet: an unverified row says «در حال بررسی». */
  checking: boolean
}

/**
 * Who sees the account: the summary sentence (always there, even with nobody), each parent with
 * the day and a status chip, and the fixed sentence that the app has no remove button (Drive does).
 */
export default function ParentRows({ parents, checking }: ParentRowsProps) {
  return (
    <Card>
      <h2 className={sharedCardTitleClass}>{parentsSummary(parents)}</h2>
      {parents.length ? (
        <ul className={journeyListClass}>
          {parents.map(parent => (
            <li key={parent.email} className={journeyRowClass}>
              <span className="min-w-0 flex-1">
                <bdi dir="ltr" className="block truncate text-start text-sm font-bold text-text">
                  {parent.email}
                </bdi>
                <span className={journeyRowMetaClass}>
                  {PARENT_STATUS_HINTS[parent.status]}
                  {parent.since ? ` · از ${formatIsoDatePersian(parent.since)}` : ''}
                </span>
              </span>
              <span className={`${PARENT_CHIP_TONE[parent.status]} shrink-0 whitespace-nowrap`}>
                {checking && parent.status === 'unverified'
                  ? 'در حال بررسی'
                  : PARENT_STATUS_LABELS[parent.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className={journeyNoteClass}>{ACCESS_END_NOTE}</p>
    </Card>
  )
}
