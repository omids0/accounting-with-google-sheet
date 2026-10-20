import { useState } from 'react'

import { optionLabel } from './buildingOptions'
import {
  ACCOUNT_TYPES,
  CHARGE_METHODS,
  DAYS_1_28,
  VACANCY_RULES,
  type ChargeMethod,
  type VacancyRule
} from './buildingOptions'
import FundAccountSheet from './FundAccountSheet'
import { fundTotal, type FundAccountDraft, type FundDraft } from './journeyDraft'
import { toPersianDigits } from '../../utils/normalizeDigits'
import AmountField from '../AmountField'
import { FormField, FormRow, FormSelect } from '../form'
import MoneyText from '../MoneyText'
import ProgressBar from '../ProgressBar'
import {
  journeyListClass,
  journeyNoteClass,
  journeyRowButtonClass,
  journeyRowMetaClass,
  journeyRowTitleClass,
  journeyTotalClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import { formErrorClass } from '../ui/formStyles'

interface JourneyFundStepProps {
  draft: FundDraft
  error: string | null
  /** True while the spreadsheet is being created; `progress` is 0..100. */
  building: boolean
  progress: number
  onChange: (next: FundDraft) => void
  onBuild: () => void
  onBack: () => void
}

function accountMeta(account: FundAccountDraft): string {
  const kind = optionLabel(ACCOUNT_TYPES, account.type)

  return account.type === 'bank' && account.cardNumber
    ? `${kind} · کارت …${toPersianDigits(account.cardNumber.slice(-4))}`
    : `${kind} · بدون کارت`
}

/**
 * Journey step 2: the fund accounts with their balances, then the charge settings. «ساخت ساختمان»
 * creates the spreadsheet; a progress bar shows the two to five seconds it takes.
 */
export default function JourneyFundStep({
  draft,
  error,
  building,
  progress,
  onChange,
  onBuild,
  onBack
}: JourneyFundStepProps) {
  const [sheet, setSheet] = useState<{ account: FundAccountDraft | null } | null>(null)

  const set = (patch: Partial<FundDraft>) => onChange({ ...draft, ...patch })

  const saveAccount = (account: FundAccountDraft) => {
    const exists = draft.accounts.some(item => item.key === account.key)

    set({
      accounts: exists
        ? draft.accounts.map(item => (item.key === account.key ? account : item))
        : [...draft.accounts, account]
    })
    setSheet(null)
  }

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        onBuild()
      }}
    >
      <div className={journeyTotalClass}>
        <span>حساب‌های صندوق</span>
        <MoneyText amount={fundTotal(draft.accounts)} />
      </div>
      <div className={journeyListClass}>
        {draft.accounts.map(account => (
          <button
            key={account.key}
            type="button"
            className={journeyRowButtonClass}
            onClick={() => setSheet({ account })}
            disabled={building}
          >
            <span>
              <span className={journeyRowTitleClass}>{account.title}</span>
              <br />
              <span className={journeyRowMetaClass}>{accountMeta(account)}</span>
            </span>
            <MoneyText amount={account.balance} />
          </button>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSheet({ account: null })}
          disabled={building}
        >
          + حساب جدید
        </Button>
      </div>

      <h3 className={journeyRowTitleClass}>شارژ</h3>
      <FormField label="شارژ پیش‌فرض (ماهانه برای هر واحد)">
        <AmountField
          label="شارژ پیش‌فرض"
          value={draft.defaultCharge}
          onChange={defaultCharge => set({ defaultCharge })}
          disabled={building}
        />
      </FormField>
      <FormSelect
        label="روش"
        value={draft.chargeMethod}
        onChange={value => set({ chargeMethod: value as ChargeMethod })}
        options={CHARGE_METHODS}
        hint={CHARGE_METHODS.find(item => item.value === draft.chargeMethod)?.hint}
        disabled={building}
      />
      <FormRow>
        <FormSelect
          label="روز صدور (هر ماه)"
          value={draft.issueDay}
          onChange={issueDay => set({ issueDay })}
          options={DAYS_1_28}
          disabled={building}
        />
        <FormSelect
          label="سررسید (روز، هر ماه)"
          value={draft.dueDay}
          onChange={dueDay => set({ dueDay })}
          options={DAYS_1_28}
          disabled={building}
        />
      </FormRow>
      <FormSelect
        label="واحد خالی"
        value={draft.vacancyRule}
        onChange={value => set({ vacancyRule: value as VacancyRule })}
        options={VACANCY_RULES}
        disabled={building}
      />

      <p className={journeyNoteClass}>
        ساخت = شیت جدید «حسابداری · ساختمان …» با تب‌ها، دسته‌های ساختمان، حساب‌های صندوق و این
        تنظیمات. چند ثانیه طول می‌کشد.
      </p>
      {building ? <ProgressBar value={progress} aria-label="ساخت ساختمان" /> : null}
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <Button type="submit" loading={building} disabled={building}>
          ساخت ساختمان
        </Button>
        <Button type="button" variant="secondary" onClick={onBack} disabled={building}>
          قبلی
        </Button>
      </div>

      <FundAccountSheet
        open={sheet !== null}
        account={sheet?.account ?? null}
        canDelete={draft.accounts.length > 1}
        onSave={saveAccount}
        onDelete={() => {
          const key = sheet?.account?.key

          set({ accounts: draft.accounts.filter(item => item.key !== key) })
          setSheet(null)
        }}
        onClose={() => setSheet(null)}
      />
    </form>
  )
}
