import { useCallback, useEffect, useRef, useState } from 'react'

import type { OnboardingStepProps } from './onboardingSteps'
import { fetchWalletAccounts } from '../../services/wallet'
import {
  getWalletAccountKindCategories,
  getWalletBankCategories
} from '../../services/walletCategories'
import type { WalletAccount } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import AppIcon from '../AppIcon'
import type { SmsTemplateDraft } from '../bankSms/SmsSampleEditor'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import {
  onboardingListClass,
  onboardingListItemClass,
  onboardingSubtitleClass,
  onboardingTitleClass
} from '../ui/onboardingStyles'
import type { WalletFormState } from '../wallet/types'
import { createWalletAccountFromForm } from '../wallet/walletAccountCreate'
import WalletFormModal from '../wallet/WalletFormModal'

interface OnboardingAccountsStepProps extends OnboardingStepProps {
  variant: 'first' | 'more'
}

const COPY = {
  first: {
    title: 'حساب کیف پول بساز',
    subtitle:
      'بانک، کارت یا پول نقدت را تعریف کن. موجودی فعلی هر حساب را همین‌جا بنویس؛ همین می‌شود موجودی اولیه‌ات.',
    add: 'افزودن حساب'
  },
  more: {
    title: 'بقیه حساب‌هایت را هم اضافه کن',
    subtitle: 'هرچه کامل‌تر، «دارایی قابل اتکا» دقیق‌تر: نقد، حساب دوم، کارت هدیه و…',
    add: 'افزودن حساب دیگر'
  }
}

export default function OnboardingAccountsStep({
  spreadsheetId,
  variant,
  onReadyChange
}: OnboardingAccountsStepProps) {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [smsDrafts, setSmsDrafts] = useState<SmsTemplateDraft[]>([])
  const [bankCategories, setBankCategories] = useState(() => getWalletBankCategories())
  const [kindCategories, setKindCategories] = useState(() => getWalletAccountKindCategories())
  const countAtStart = useRef<number | null>(null)

  const load = useCallback(async () => {
    const list = await fetchWalletAccounts(spreadsheetId).catch(() => [])

    countAtStart.current ??= list.length
    setAccounts(list)
  }, [spreadsheetId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const baseline = variant === 'first' ? 0 : countAtStart.current ?? Infinity

    onReadyChange(accounts.length > baseline)
  }, [accounts, variant, onReadyChange])

  const openForm = () => {
    setSmsDrafts([])
    setFormOpen(true)
  }

  const handleSubmit = async (form: WalletFormState) => {
    setSaving(true)
    try {
      await createWalletAccountFromForm(spreadsheetId, form, smsDrafts)
      showSuccess('حساب جدید اضافه شد')
      setFormOpen(false)
      await load()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ثبت حساب' })
    } finally {
      setSaving(false)
    }
  }

  const copy = COPY[variant]

  return (
    <>
      <div>
        <h2 className={onboardingTitleClass}>{copy.title}</h2>
        <p className={onboardingSubtitleClass}>{copy.subtitle}</p>
      </div>

      {accounts.length > 0 && (
        <ul className={onboardingListClass} aria-label="حساب‌های ساخته‌شده">
          {accounts.map(account => (
            <li key={account.id} className={onboardingListItemClass}>
              <span className="inline-flex items-center gap-2">
                <AppIcon name="check" size={16} />
                {account.title}
              </span>
              <span dir="ltr">
                <MoneyText amount={account.balance} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" onClick={openForm}>
        <AppIcon name="add" size={18} />
        {copy.add}
      </Button>

      <WalletFormModal
        open={formOpen}
        editingAccount={null}
        saving={saving}
        bankCategories={bankCategories}
        onBankCategoriesChange={setBankCategories}
        accountKindCategories={kindCategories}
        onAccountKindCategoriesChange={setKindCategories}
        onClose={() => !saving && setFormOpen(false)}
        onSubmit={handleSubmit}
        smsDrafts={smsDrafts}
        onSmsDraftsChange={setSmsDrafts}
      />
    </>
  )
}
