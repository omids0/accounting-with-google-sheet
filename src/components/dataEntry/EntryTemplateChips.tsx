import { useState } from 'react'

import EntryTemplatesSheet from './EntryTemplatesSheet'
import { templateLabel, templateMeta } from './templateText'
import type { useEntryTemplates } from './useEntryTemplates'
import type { EntryTemplate } from '../../services/entryTemplates'
import { cn } from '../../utils/cn'
import {
  entryTemplateChipClass,
  entryTemplateChipLabelClass,
  entryTemplateChipMetaClass,
  entryTemplateChipPinnedClass,
  entryTemplatesClass,
  entryTemplatesHeadClass,
  entryTemplatesLinkClass,
  entryTemplatesRowClass
} from '../ui/entryAssistStyles'

/**
 * «پرتکرارها»: up to six chips above the entry form; a tap fills the form from the
 * group's last record. «ویرایش» pins (always first) or hides chips.
 */
export default function EntryTemplateChips({
  templates,
  onPick
}: {
  templates: ReturnType<typeof useEntryTemplates>
  onPick: (template: EntryTemplate) => void
}) {
  const [editing, setEditing] = useState(false)
  const { chips, groups, accountTitle } = templates

  if (!groups.length) return null

  return (
    <section className={entryTemplatesClass} aria-label="پرتکرارها">
      <div className={entryTemplatesHeadClass}>
        <span>پرتکرارها</span>
        <button type="button" className={entryTemplatesLinkClass} onClick={() => setEditing(true)}>
          ویرایش
        </button>
      </div>
      {chips.length ? (
        <div className={entryTemplatesRowClass}>
          {chips.map(chip => {
            const meta = templateMeta(chip, accountTitle(chip.accountId))

            return (
              <button
                key={chip.key}
                type="button"
                className={cn(entryTemplateChipClass, chip.pinned && entryTemplateChipPinnedClass)}
                onClick={() => onPick(chip)}
                aria-label={`پر کردن فرم با ${templateLabel(chip)}${meta ? ` (${meta})` : ''}`}
              >
                <span className={entryTemplateChipLabelClass}>{templateLabel(chip)}</span>
                {meta ? <span className={entryTemplateChipMetaClass}>{meta}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <EntryTemplatesSheet open={editing} templates={templates} onClose={() => setEditing(false)} />
    </section>
  )
}
