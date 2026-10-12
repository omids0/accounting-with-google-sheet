import { useEffect, useState, type FormEvent } from 'react'

import { templateLabel, templateMeta } from './templateText'
import type { useEntryTemplates } from './useEntryTemplates'
import type { EntryTemplatePrefs } from '../../services/entryTemplates'
import FormModal from '../FormModal'
import ToggleChipGroup from '../ToggleChipGroup'
import {
  entryTemplateChipLabelClass,
  entryTemplateChipMetaClass,
  entryTemplateEditRowClass,
  entryTemplateEditTextClass
} from '../ui/entryAssistStyles'
import { formHintClass } from '../ui/formStyles'

function toggle(list: string[], key: string, on: boolean): string[] {
  const rest = list.filter(item => item !== key)

  return on ? [...rest, key] : rest
}

/** «ویرایش پرتکرارها»: pin a chip (always first) or hide it; kept on this device. */
export default function EntryTemplatesSheet({
  open,
  templates,
  onClose
}: {
  open: boolean
  templates: ReturnType<typeof useEntryTemplates>
  onClose: () => void
}) {
  const { groups, prefs, savePrefs, accountTitle } = templates
  const [draft, setDraft] = useState<EntryTemplatePrefs>(prefs)

  useEffect(() => {
    if (open) setDraft(prefs)
  }, [open, prefs])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    savePrefs(draft)
    onClose()
  }

  return (
    <FormModal
      open={open}
      title="ویرایش پرتکرارها"
      onClose={onClose}
      onSubmit={onSubmit}
      saveLabel="ذخیره"
    >
      <p className={formHintClass}>
        سنجاق‌شده‌ها همیشه اول می‌آیند؛ پنهان‌شده‌ها دیگر نشان داده نمی‌شوند.
      </p>
      {groups.map(group => {
        const pinned = draft.pinned.includes(group.key)
        const hidden = draft.hidden.includes(group.key)

        return (
          <div key={group.key} className={entryTemplateEditRowClass}>
            <div className={entryTemplateEditTextClass}>
              <div className={entryTemplateChipLabelClass}>{templateLabel(group)}</div>
              <div className={entryTemplateChipMetaClass}>
                {templateMeta(group, accountTitle(group.accountId))}
              </div>
            </div>
            <ToggleChipGroup
              ariaLabel={templateLabel(group)}
              options={[
                { id: 'pin', label: 'سنجاق' },
                { id: 'hide', label: 'پنهان' }
              ]}
              selected={{ pin: pinned, hide: hidden }}
              onToggle={id =>
                setDraft(current =>
                  id === 'pin'
                    ? {
                        pinned: toggle(current.pinned, group.key, !pinned),
                        hidden: toggle(current.hidden, group.key, false)
                      }
                    : {
                        pinned: toggle(current.pinned, group.key, false),
                        hidden: toggle(current.hidden, group.key, !hidden)
                      }
                )
              }
            />
          </div>
        )
      })}
    </FormModal>
  )
}
