import { useState } from 'react'

import IssueChargesSheet from './IssueChargesSheet'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { JALALI_MONTHS } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardHintClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

interface BuildingIssueCardProps {
  /** Jalali `YYYY-MM` of the month nobody was billed for yet. */
  monthKey: string
  issueDay: number
  /** Called after the sheet issued the charges, so the dashboard reads its data again. */
  onIssued: () => void
}

/** Guide card «شارژ مهر صادر نشده»: from the issue day until the month is issued. */
export default function BuildingIssueCard({
  monthKey,
  issueDay,
  onIssued
}: BuildingIssueCardProps) {
  const { can } = useBuildingAccess()
  const [open, setOpen] = useState(false)

  const month = JALALI_MONTHS[Number(monthKey.split('-')[1]) - 1] ?? ''

  return (
    <Card className={guideCardClass}>
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="info" size={20} />
      </span>
      <div className={guideCardTextClass}>
        <span className={guideCardTitleClass}>شارژ {month} صادر نشده</span>
        <span className={guideCardHintClass}>
          روز صدور ({toPersianDigits(String(issueDay))} هر ماه) گذشته است.
        </span>
      </div>
      {can('issue') ? (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          بررسی و صدور
        </Button>
      ) : null}
      <IssueChargesSheet
        open={open}
        monthKey={monthKey}
        onClose={() => setOpen(false)}
        onIssued={() => {
          setOpen(false)
          onIssued()
        }}
      />
    </Card>
  )
}
