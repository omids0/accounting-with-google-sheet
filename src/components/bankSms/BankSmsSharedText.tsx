import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import BankSmsUnknownCard from './BankSmsUnknownCard'
import { useSmsTemplates } from './useSmsTemplates'
import { getPathForTab } from '../../routes/paths'
import { getBankSmsPrefs } from '../../services/bankSmsPrefs'
import { routeSharedText, sharedSmsEntry } from '../../services/bankSmsShare'
import { buildEntryDraftState } from '../../services/entryDraft'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import { getCurrency } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import EmptyState from '../EmptyState'
import { smsHintClass, smsPageClass } from '../ui/bankSmsStyles'
import type { WalletAccountWithRow } from '../wallet/types'

/**
 * Text shared into the app (web share target; the only bank SMS path on iOS).
 * A recognised SMS opens the entry form pre-filled; an unknown one shows the
 * «پیامک ناشناخته» card, and once its amount is tapped the form opens the same way.
 */
export default function BankSmsSharedText({ text }: { text: string }) {
  const navigate = useNavigate()
  const templatesApi = useSmsTemplates()
  const [accounts, setAccounts] = useState<WalletAccountWithRow[] | null>(null)
  const [receivedAt] = useState(() => Date.now())
  const entry = useMemo(() => sharedSmsEntry(text, receivedAt), [text, receivedAt])
  const { templates, loading } = templatesApi

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    fetchWalletAccounts(spreadsheetId)
      .then(setAccounts)
      .catch(err => {
        setAccounts([])
        handleSheetError(err, { fallbackMessage: 'خطا در خواندن حساب‌ها' })
      })
  }, [])

  const route = useMemo(
    () =>
      accounts && !loading
        ? routeSharedText(
            text,
            templates,
            accounts,
            getCurrency(),
            getBankSmsPrefs().refAccounts,
            receivedAt
          )
        : null,
    [accounts, loading, templates, text, receivedAt]
  )

  // Also after a template is saved from the card: the text is recognised now.
  useEffect(() => {
    if (route?.kind !== 'entry') return

    navigate(getPathForTab('entry', { formType: route.formType }), {
      replace: true,
      state: buildEntryDraftState(route.formType, route.prefill)
    })
  }, [route, navigate])

  if (route?.kind !== 'unknown' || !accounts) {
    return <EmptyState icon="empty-inbox" message="در حال خواندن پیامک…" />
  }

  return (
    <div className={smsPageClass}>
      <p className={smsHintClass}>
        این پیامک با قالب‌های ذخیره‌شده جور نشد؛ بعد از ساخت قالب، فرم ثبت باز می‌شود.
      </p>
      <BankSmsUnknownCard
        entry={entry}
        accounts={accounts}
        templatesApi={templatesApi}
        busy={false}
        onDismiss={() => navigate('/', { replace: true })}
      />
    </div>
  )
}
