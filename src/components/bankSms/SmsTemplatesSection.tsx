import { useMemo, useState } from 'react'

import { describeSmsTemplate } from './smsLabels'
import SmsSampleEditor, { type SmsTemplateDraft } from './SmsSampleEditor'
import { useSmsTemplates } from './useSmsTemplates'
import type { SmsTemplate } from '../../types'
import AppIcon from '../AppIcon'
import {
  smsHintClass,
  smsSectionClass,
  smsSectionHeaderClass,
  smsSectionTitleClass,
  smsTemplateItemClass,
  smsTemplateListClass,
  smsTemplateTextClass
} from '../ui/bankSmsStyles'
import Button from '../ui/Button'

type SmsTemplatesSectionProps = {
  /** `null` while creating an account: templates are kept as drafts until it is saved. */
  accountId: string | null
  drafts: SmsTemplateDraft[]
  onDraftsChange: (next: SmsTemplateDraft[]) => void
}

type ListedTemplate = { key: string; template: SmsTemplate; onRemove: () => void }

function asTemplate(draft: SmsTemplateDraft, key: string): SmsTemplate {
  return { ...draft, id: key, createdAt: '', accountId: '' }
}

/** «پیامک‌های نمونه» block of the wallet account form. */
export default function SmsTemplatesSection({
  accountId,
  drafts,
  onDraftsChange
}: SmsTemplatesSectionProps) {
  const { templates, saving, add, remove } = useSmsTemplates()
  const [editing, setEditing] = useState(false)

  const learned = useMemo(
    () => [...templates, ...drafts.map((draft, index) => asTemplate(draft, `draft-${index}`))],
    [templates, drafts]
  )

  const listed: ListedTemplate[] = [
    ...templates
      .filter(template => accountId && template.accountId === accountId)
      .map(template => ({ key: template.id, template, onRemove: () => void remove(template) })),
    ...drafts.map((draft, index) => ({
      key: `draft-${index}`,
      template: asTemplate(draft, `draft-${index}`),
      onRemove: () => onDraftsChange(drafts.filter((_, i) => i !== index))
    }))
  ]

  const save = async (draft: SmsTemplateDraft) => {
    if (accountId) {
      if (await add({ ...draft, accountId })) setEditing(false)

      return
    }
    onDraftsChange([...drafts, draft])
    setEditing(false)
  }

  return (
    <section className={smsSectionClass} aria-label="پیامک‌های نمونه">
      <div className={smsSectionHeaderClass}>
        <h3 className={smsSectionTitleClass}>پیامک‌های نمونه</h3>
        {!editing && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <AppIcon name="add" size={14} />
            افزودن پیامک نمونه
          </Button>
        )}
      </div>

      <p className={smsHintClass}>
        برای هر نوع پیامک این حساب (برداشت، واریز) یک نمونه ثبت کنید تا اپ پیامک‌های بعدی را خودکار
        بشناسد. مبلغ و شماره کارتِ نمونه ذخیره نمی‌شود.
      </p>

      {listed.length > 0 && (
        <ul className={smsTemplateListClass}>
          {listed.map(item => (
            <li key={item.key} className={smsTemplateItemClass}>
              <span className={smsTemplateTextClass}>{describeSmsTemplate(item.template)}</span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={item.onRemove}
                aria-label="حذف قالب"
              >
                <AppIcon name="trash" size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SmsSampleEditor
          learned={learned}
          saving={saving}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      )}
    </section>
  )
}
