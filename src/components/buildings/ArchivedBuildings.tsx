import { useState } from 'react'

import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import type { SpreadsheetEntry } from '../../types'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { buildingRowTitleClass, buildingLinkClass } from '../ui/buildingStyles'
import { calmListClass, calmRowClass, calmRowMainClass } from '../ui/calmListStyles'

/**
 * «بایگانی‌شده» on the «مدیر ساختمان» home: the buildings archived from their settings. The sheet
 * was never touched, so «بازگردانی» just lists the building again.
 */
export default function ArchivedBuildings({
  entries,
  onRestore
}: {
  entries: SpreadsheetEntry[]
  onRestore: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  if (!entries.length) return null

  return (
    <section aria-label="بایگانی‌شده">
      <button
        type="button"
        className={buildingLinkClass}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {`بایگانی‌شده (${toPersianDigits(String(entries.length))}) ${open ? '▴' : '▾'}`}
      </button>
      {open ? (
        <ul className={calmListClass}>
          {entries.map(entry => (
            <li key={entry.id} className={calmRowClass}>
              <span className={calmRowMainClass}>
                <span className={buildingRowTitleClass}>{getSpreadsheetLabel(entry.name)}</span>
              </span>
              <button
                type="button"
                className={buildingLinkClass}
                onClick={() => onRestore(entry.id)}
              >
                بازگردانی
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
