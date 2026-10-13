import { cx } from '../../utils/cn'

/** Settings › «نمایش»: one row per setting, label and hint before the control. */
export const displaySettingsRowClass =
  'flex min-h-12 items-center gap-3 border-t border-border py-2.5 first:border-t-0'

export const displaySettingsRowStackClass =
  'flex flex-col gap-2 border-t border-border py-2.5 first:border-t-0'

export const displaySettingsRowTextClass = 'min-w-0 flex-1'

export const displaySettingsRowTitleClass = 'block text-[0.88rem] font-semibold text-text'

export const displaySettingsRowHintClass = 'mt-0.5 block text-[0.74rem] leading-normal text-muted'

/** The live text-size sample under the size control. */
export const displaySettingsPreviewClass = cx(
  'rounded-[var(--radius-sm)] border border-border bg-surface px-3 pt-1 pb-2'
)

export const displaySettingsPreviewCaptionClass = 'block text-[0.7rem] text-muted'
