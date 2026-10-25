import type { SharedPartnerRole } from '../../services/sharedTemplate'
import { FormField, SegmentedRadio } from '../form'
import { assignableRoles } from './memberCopy'
import { alertClassName } from '../ui/Alert'
import {
  journeyBarPillClass,
  journeyNoteClass,
  journeyRowTitleClass,
  journeyTotalClass
} from '../ui/buildingStyles'

/** What step 2 collects; the split of step 3 has a single choice in v1 («نصف‌نصف»). */
export interface SharedSetupDraft {
  name: string
  email: string
  role: SharedPartnerRole
}

/** The wizard's static notices: no `role="alert"` (nothing went wrong) and no slide-in on each step. */
const noticeClass = alertClassName('info', 'mb-0 animate-none text-sm leading-[1.8]')

const columnClass = 'flex flex-col gap-1 rounded-[12px] border border-border bg-surface p-3'

const SHARED_ITEMS = ['هزینه و درآمد خانه', 'دسته‌ها و بودجهٔ خانه', 'تسویه بین شما']

const PRIVATE_ITEMS = ['حساب شخصی شما', 'کیف پول، چک و مطالبات شخصی', 'پیامک‌های بانکی شما']

function Column({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={columnClass}>
      <h4 className={journeyRowTitleClass}>{title}</h4>
      <ul className="m-0 list-disc ps-5 text-sm leading-[1.9] text-text">
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/** Step 1: what is shared and what stays private. */
export function SharedIntroStep() {
  return (
    <>
      <h3 className={journeyRowTitleClass}>چه چیزی مشترک می‌شود؟</h3>
      <div className="grid grid-cols-2 gap-2">
        <Column title="مشترک" items={SHARED_ITEMS} />
        <Column title="خصوصی می‌ماند" items={PRIVATE_ITEMS} />
      </div>
      <p className={noticeClass}>
        یک شیت تازه در درایو خودتان ساخته می‌شود و فقط با ایمیلی که وارد می‌کنید به اشتراک می‌رسد.
      </p>
    </>
  )
}

const ROLE_OPTIONS = assignableRoles('shared')

/** Step 2: the account's name, the partner's Google e-mail and their role. */
export function SharedInviteStep({
  draft,
  onChange
}: {
  draft: SharedSetupDraft
  onChange: (next: SharedSetupDraft) => void
}) {
  const set = (patch: Partial<SharedSetupDraft>) => onChange({ ...draft, ...patch })

  return (
    <>
      <h3 className={journeyRowTitleClass}>شریک‌تان را دعوت کنید</h3>
      <FormField label="نام حساب مشترک" required>
        <input
          value={draft.name}
          onChange={event => set({ name: event.target.value })}
          placeholder="مثلاً خانهٔ ما"
          autoComplete="off"
        />
      </FormField>
      <FormField label="ایمیل حساب گوگل شریک" required>
        <input
          type="email"
          dir="ltr"
          inputMode="email"
          value={draft.email}
          onChange={event => set({ email: event.target.value })}
          placeholder="name@gmail.com"
          autoComplete="off"
        />
      </FormField>
      <div className="flex flex-col gap-1.5">
        <span className={journeyRowTitleClass}>نقش</span>
        <SegmentedRadio
          label="نقش"
          value={draft.role}
          onChange={role => set({ role })}
          options={ROLE_OPTIONS.map(option => ({
            value: option.value as SharedPartnerRole,
            label: option.label
          }))}
        />
        <span className={journeyNoteClass}>
          {ROLE_OPTIONS.find(option => option.value === draft.role)?.hint}
        </span>
      </div>
      <p className={noticeClass}>گوگل برای شریک‌تان ایمیل دعوت می‌فرستد. باید یک حساب گوگل باشد.</p>
    </>
  )
}

/** Step 3: the default split and the promise that nothing is shared by itself. */
export function SharedSplitStep() {
  return (
    <>
      <h3 className={journeyRowTitleClass}>قاعدهٔ پیش‌فرض تقسیم</h3>
      <div className={journeyTotalClass}>
        <span>تقسیم هر هزینه</span>
        <span className={journeyBarPillClass}>نصف‌نصف</span>
      </div>
      <p className={journeyNoteClass}>
        هر هزینه را هنگام ثبت می‌توانید عوض کنید. این فقط مقدار پیش‌فرض است.
      </p>
      <p className={noticeClass}>هیچ ثبتی خودکار به حساب مشترک نمی‌رود، حتی پیامک بانکی.</p>
    </>
  )
}
