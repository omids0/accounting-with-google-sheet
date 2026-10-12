import { useEffect, useState } from 'react'

import SmsSampleEditor from './SmsSampleEditor'
import type { useSmsTemplates } from './useSmsTemplates'
import { FormField, Select } from '../form'
import PickerSheet from '../form/PickerSheet'
import type { WalletAccountWithRow } from '../wallet/types'
import { resolveAccountKind } from '../wallet/walletCardUtils'

type BankSmsTemplateSheetProps = {
  /** The SMS text the editor starts from; `null` = closed. */
  text: string | null
  /** Preselected account ('' = the user picks). */
  accountId: string
  accounts: WalletAccountWithRow[]
  templatesApi: ReturnType<typeof useSmsTemplates>
  /** «ویرایش قالب» of a recognised SMS: the template the new one replaces. */
  replaceTemplateId?: string
  onClose: () => void
}

/** ⋯ «ویرایش قالب»: the full sample editor (every number's role, direction) in a sheet. */
export default function BankSmsTemplateSheet({
  text,
  accountId: initialAccountId,
  accounts,
  templatesApi,
  replaceTemplateId,
  onClose
}: BankSmsTemplateSheetProps) {
  const { templates, saving, add, remove } = templatesApi
  const [accountId, setAccountId] = useState(initialAccountId)
  const options = accounts.filter(account => resolveAccountKind(account) !== 'cash')

  useEffect(() => {
    if (text !== null) setAccountId(initialAccountId)
  }, [text, initialAccountId])

  const save = async (draft: Parameters<typeof add>[0]) => {
    if (!(await add(draft))) return

    const replaced = templates.find(template => template.id === replaceTemplateId)

    if (replaced) await remove(replaced)
    onClose()
  }

  return (
    <PickerSheet open={text !== null} title="ویرایش قالب پیامک" onClose={onClose}>
      <FormField label="این پیامک مال کدام حساب است؟" required controlWidth="full">
        <Select
          value={accountId}
          onChange={setAccountId}
          aria-label="حساب این پیامک"
          options={[
            { value: '', label: 'انتخاب حساب', disabled: true },
            ...options.map(account => ({ value: account.id, label: account.title }))
          ]}
        />
      </FormField>
      {accountId && text !== null && (
        <SmsSampleEditor
          learned={templates}
          initialText={text}
          saving={saving}
          onSave={draft => save({ ...draft, accountId })}
          onCancel={onClose}
        />
      )}
    </PickerSheet>
  )
}
