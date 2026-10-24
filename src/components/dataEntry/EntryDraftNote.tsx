import { cn } from '../../utils/cn'
import { entryTemplatesLinkClass } from '../ui/entryAssistStyles'
import { formHintClass } from '../ui/formStyles'

/** «پیش‌نویس بازیابی شد»: what was typed before leaving the page is back. */
export default function EntryDraftNote({ onDiscard }: { onDiscard: () => void }) {
  return (
    <p className={cn(formHintClass, 'flex items-center gap-1')}>
      <span>پیش‌نویس بازیابی شد</span>
      <button type="button" className={entryTemplatesLinkClass} onClick={onDiscard}>
        پاک کردن
      </button>
    </p>
  )
}
