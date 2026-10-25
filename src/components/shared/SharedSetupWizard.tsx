import { useState } from 'react'

import {
  SharedIntroStep,
  SharedInviteStep,
  SharedSplitStep,
  type SharedSetupDraft
} from './SharedSetupSteps'
import { useCreepingBusy } from '../../hooks/useCreepingBusy'
import { useEnterWorkspace } from '../../hooks/useEnterWorkspace'
import { getUserEmail, isAuthError } from '../../services/auth'
import { shareErrorMessage } from '../../services/driveShare'
import { createSharedSpreadsheet, sharedSetupError } from '../../services/sharedTemplate'
import { sharedSpreadsheetId } from '../../services/workspace'
import { requestReauth } from '../../stores/appStore'
import { hideBusy } from '../../stores/busyOverlayStore'
import { toUserMessage } from '../../utils/userMessage'
import { CREATE_ENTER_MESSAGE } from '../buildings/buildingBusyText'
import JourneyStepper, { type StepperStep } from '../buildings/JourneyStepper'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { journeyPageClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formErrorClass } from '../ui/formStyles'

type Step = 'intro' | 'invite' | 'split'

const STEPS: (StepperStep & { key: Step })[] = [
  { key: 'intro', title: 'مشترک و خصوصی' },
  { key: 'invite', title: 'شریک' },
  { key: 'split', title: 'تقسیم' }
]

/** The waits of «ساخت فضا و ارسال دعوت»; the no-break space keeps «Google Drive» on one line. */
const CREATE_STEPS = {
  file: { label: 'در حال ساخت فایل حساب مشترک در Google Drive…', ceiling: 50 },
  invite: { label: 'در حال فرستادن دعوت…', ceiling: 80 },
  enter: { label: CREATE_ENTER_MESSAGE, ceiling: 96 }
} as const

const NOT_INVITED_NOTE = 'فایل حساب مشترک ساخته شد ولی دعوت نرفت؛ از «اعضا» دوباره دعوت کنید.'

/**
 * «راه‌اندازی حساب مشترک» in three steps (prototype `راه‌اندازی`): what is shared, the partner,
 * the default split. Nothing is written until «ساخت فضا و ارسال دعوت»: the file is created in the
 * owner's Drive, the partner invited (Drive first) and the account opened. When Drive refuses the
 * invitation the file stays, and the button opens the account's «اعضا» to invite again.
 */
export default function SharedSetupWizard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState<Step>('intro')
  const [draft, setDraft] = useState<SharedSetupDraft>({ name: '', email: '', role: 'partner' })
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const busy = useCreepingBusy<keyof typeof CREATE_STEPS>(CREATE_STEPS, 'file')
  const { enter, modalProps } = useEnterWorkspace()

  const index = STEPS.findIndex(item => item.key === step)

  const goTo = (next: Step) => {
    setError(null)
    setStep(next)
  }

  const next = () => {
    if (step === 'invite') {
      const problem = sharedSetupError(draft, getUserEmail() ?? '')

      setError(problem)
      if (problem) return
    }
    goTo(STEPS[index + 1].key)
  }

  const create = async () => {
    if (createdId) {
      await enter(createdId, 'shared-members')

      return
    }

    const before = sharedSpreadsheetId()

    setError(null)
    busy.start('file')
    try {
      const id = await createSharedSpreadsheet(draft.name, draft.email, draft.role, () =>
        busy.advance('invite', 52)
      )

      busy.advance('enter', 82)
      if (await enter(id, 'shared-home', CREATE_STEPS.enter.label)) busy.complete()
      else setCreatedId(id)
    } catch (err) {
      hideBusy()
      if (isAuthError(err)) requestReauth()

      const kept = sharedSpreadsheetId()

      if (kept && kept !== before) {
        setCreatedId(kept)
        setError(
          `${shareErrorMessage(err, 'ارسال دعوت ناموفق بود', 'حساب مشترک')}. ${NOT_INVITED_NOTE}`
        )
      } else {
        setError(toUserMessage(err, 'ساخت حساب مشترک ناموفق بود'))
      }
    } finally {
      busy.stop()
    }
  }

  const last = step === 'split'

  return (
    <div className={journeyPageClass}>
      <Card className="flex flex-col gap-4">
        <h2 className="text-[1rem] font-extrabold text-text">راه‌اندازی حساب مشترک</h2>
        <JourneyStepper
          step={step}
          steps={STEPS}
          onBack={
            index > 0 && !busy.active && !createdId ? () => goTo(STEPS[index - 1].key) : undefined
          }
        />
        <form
          className="flex flex-col gap-4"
          onSubmit={event => {
            event.preventDefault()
            if (last) void create()
            else next()
          }}
        >
          {step === 'intro' ? <SharedIntroStep /> : null}
          {step === 'invite' ? (
            <SharedInviteStep
              draft={draft}
              onChange={value => {
                // A fixed field no longer shows the old complaint.
                setError(null)
                setDraft(value)
              }}
            />
          ) : null}
          {last ? <SharedSplitStep /> : null}
          {error ? (
            <p className={formErrorClass} role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button type="submit" loading={busy.active} disabled={busy.active}>
              {!last ? 'ادامه' : createdId ? 'باز کردن «اعضا»' : 'ساخت فضا و ارسال دعوت'}
            </Button>
            {index === 0 ? (
              <Button type="button" variant="secondary" onClick={onCancel}>
                انصراف
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
      <SheetSwitchConfirmModal {...modalProps} />
    </div>
  )
}
