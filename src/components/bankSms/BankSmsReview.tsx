import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import BankSmsBulkBar from './BankSmsBulkBar'
import BankSmsHelp from './BankSmsHelp'
import BankSmsQueueItem from './BankSmsQueueItem'
import BankSmsQueueTable from './BankSmsQueueTable'
import BankSmsSettingsCard from './BankSmsSettingsCard'
import BankSmsSettingsSheet from './BankSmsSettingsSheet'
import BankSmsStatusRow from './BankSmsStatusRow'
import { useBankSmsReview } from './useBankSmsReview'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { smsRangeStart } from '../../services/bankSmsRange'
import { routedCardLabels } from '../../services/bankSmsRouting'
import { applyBankSmsViewDays } from '../../services/bankSmsViewRange'
import { getSettings } from '../../services/settings'
import AppIcon from '../AppIcon'
import type { BuildingSetupData } from '../buildings/useBuildingSetupData'
import EmptyState from '../EmptyState'
import { useHeaderSlots } from '../layout/headerSlots'
import { smsHintClass, smsPageClass, smsQueueListClass } from '../ui/bankSmsStyles'
import Card from '../ui/Card'
import { headerActionBtnClass } from '../ui/layoutStyles'

/** Page order: pending line → queue → bottom bar; help, range and templates behind ⚙. */
export default function BankSmsReview({
  building = null
}: {
  building?: BuildingSetupData | null
}) {
  const [days, setDays] = useState(() => getBankSmsPrefs().viewDays)
  const sinceMs = useMemo(() => smsRangeStart(days), [days])
  const review = useBankSmsReview(sinceMs, building)
  const [enabled, setEnabled] = useState(() => getBankSmsPrefs().enabled)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const headerEnd = useHeaderSlots().pageEnd
  const { templates, loading: templatesLoading, reload: reloadTemplates } = review.templatesApi
  const { scanFrom } = review

  // Read the chosen range from the inbox (already handled SMS never come back).
  useEffect(() => {
    if (enabled) void scanFrom(sinceMs).catch(() => undefined)
  }, [enabled, sinceMs, scanFrom])

  const settingsButton = (
    <button
      type="button"
      className={headerActionBtnClass}
      onClick={() => setSettingsOpen(true)}
      aria-label="تنظیمات پیامک بانکی"
      title="تنظیمات پیامک بانکی"
    >
      <AppIcon name="settings" size={18} />
    </button>
  )

  return (
    <div className={smsPageClass}>
      {headerEnd && createPortal(settingsButton, headerEnd)}

      {!enabled ? (
        <BankSmsSettingsCard
          onChanged={() => {
            setEnabled(getBankSmsPrefs().enabled)
            void review.refresh()
          }}
        />
      ) : (
        <>
          <BankSmsStatusRow
            count={review.items.length}
            days={days}
            onOpenSettings={() => setSettingsOpen(true)}
            routing={
              building
                ? {
                    cards: routedCardLabels(getSettings()?.spreadsheetId ?? ''),
                    note: 'کارت‌های شخصی شما در صف حساب شخصی می‌مانند'
                  }
                : undefined
            }
          />

          {!templatesLoading && templates.length === 0 && (
            <Card className="mb-0">
              <BankSmsHelp />
            </Card>
          )}

          {review.items.length === 0 ? (
            <EmptyState
              icon="empty-inbox"
              message={
                review.loading ? 'در حال خواندن پیامک‌ها…' : 'پیامک بانکی در انتظار بررسی نیست'
              }
            />
          ) : isDesktop ? (
            <BankSmsQueueTable review={review} />
          ) : (
            <div className={smsQueueListClass}>
              {review.items.map(item => (
                <BankSmsQueueItem key={item.key} item={item} review={review} />
              ))}
              <p className={smsHintClass}>
                کشیدن کارت به راست = ثبت با دسته پیشنهادی · به چپ = نادیده. «⋯» = قبلاً ثبت شده،
                دیدن متن کامل، ویرایش قالب.
              </p>
            </div>
          )}

          <BankSmsBulkBar
            count={review.bulkCount}
            busy={review.busyKey === 'all'}
            onConfirmAll={() => void review.confirmAll()}
            unitCount={review.bulkUnitCount}
            inBuilding={!!building}
          />
        </>
      )}

      <BankSmsSettingsSheet
        open={settingsOpen}
        enabled={enabled}
        days={days}
        accounts={review.accounts}
        onDaysChange={next => {
          setDays(next)
          void applyBankSmsViewDays(next)
        }}
        onEnabledChange={() => {
          setEnabled(getBankSmsPrefs().enabled)
          void review.refresh()
        }}
        onClose={() => {
          setSettingsOpen(false)
          // A template removed in the sheet changes what the queue recognises.
          void reloadTemplates()
        }}
      />
    </div>
  )
}
