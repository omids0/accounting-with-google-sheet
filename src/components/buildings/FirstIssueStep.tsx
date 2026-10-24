import type { ReactNode } from 'react'

import IssueChargesSheet from './IssueChargesSheet'
import { monthKeyOf } from '../../services/buildingSummary'

interface FirstIssueStepProps {
  open: boolean
  header?: ReactNode
  onClose: () => void
  /** The first month was issued (journey «صدور شارژ مهر برای ۱۲ واحد»). */
  onIssued: (count: number) => void
}

/**
 * Journey step 6: the building's first charge, always manual with the preview of Step 4's
 * `IssueChargesSheet`. «رد کردن» (the step bar) leaves the charges page empty with
 * «صدور اولین شارژ»; only after a charge month exists does the automatic issue run.
 */
export default function FirstIssueStep({ open, header, onClose, onIssued }: FirstIssueStepProps) {
  return (
    <IssueChargesSheet
      open={open}
      monthKey={monthKeyOf()}
      firstIssue
      header={header}
      onClose={onClose}
      onIssued={onIssued}
    />
  )
}
