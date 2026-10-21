import { useMemo, type ReactNode } from 'react'

import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { members } from '../../services/buildingRoles'
import { getSettings } from '../../services/settings'
import FormModal from '../FormModal'
import { ownFileSummary, spreadsheetFileName } from './buildingFileText'
import { buildJourneySummary } from './journeySummary'
import type { BuildingSetupData } from './useBuildingSetupData'
import {
  journeyListClass,
  journeyRowClass,
  journeyRowMetaClass,
  journeyRowTitleClass
} from '../ui/buildingStyles'
import { cardTitleClassName } from '../ui/Card'

interface JourneySummarySheetProps {
  open: boolean
  data: BuildingSetupData
  header?: ReactNode
  /** Back to the previous step without finishing. */
  onClose: () => void
  /** «رفتن به داشبورد»: the summary is confirmed and the journey flag can go. */
  onFinish: () => void
}

/**
 * Journey step 8: what was set up (building, units and occupancy, accounts and total, charge
 * settings, first issued month, previous debts, members), a note on what comes next and a text
 * to share. Confirming it ends the journey.
 */
export default function JourneySummarySheet({
  open,
  data,
  header,
  onClose,
  onFinish
}: JourneySummarySheetProps) {
  const { copy } = useCopyToClipboard()

  const summary = useMemo(
    () =>
      data.profile
        ? buildJourneySummary({
            profile: data.profile,
            units: data.units,
            accounts: data.accounts,
            receivables: data.receivables,
            members: open ? members() : []
          })
        : null,
    [data, open]
  )

  return (
    <FormModal
      open={open}
      title="جمع‌بندی راه‌اندازی"
      header={header}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onFinish()
      }}
      saveLabel="رفتن به داشبورد"
      cancelLabel="اشتراک خلاصه"
      onCancel={() => summary && void copy(summary.text, 'خلاصه کپی شد')}
    >
      {summary
        ? summary.sections.map(section => (
            <section key={section.title}>
              <h3 className={cardTitleClassName()}>{section.title}</h3>
              <div className={journeyListClass}>
                {section.rows.map(row => (
                  <div key={`${section.title}:${row.label}`} className={journeyRowClass}>
                    <span className={journeyRowMetaClass}>{row.label}</span>
                    <span className={journeyRowTitleClass}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ))
        : null}
      <p className={journeyRowMetaClass}>
        {ownFileSummary(spreadsheetFileName(getSettings()?.spreadsheetId ?? ''))}
      </p>
      <p className={journeyRowMetaClass}>
        بعدش چی؟ پیامک‌های کارت صندوق به همین ساختمان می‌آیند؛ هزینه‌ها را با «+» داشبورد ثبت کن.
        صدور خودکار شارژ از ماه بعد از اولین صدور شروع می‌شود.
      </p>
    </FormModal>
  )
}
