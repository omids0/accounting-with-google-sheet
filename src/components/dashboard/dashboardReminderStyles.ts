import { cn } from '../../utils/cn'
import { cardClassName } from '../ui/Card'

export const dashboardRemindersCardClass = cn(
  cardClassName(),
  'dashboard-reminders-card relative isolate overflow-hidden',
  'border-[var(--color-warning-border)]',
  '[background:linear-gradient(160deg,var(--color-warning-bg)_0%,color-mix(in_srgb,var(--color-warning-bg)_35%,var(--color-surface))_100%)]',
  'shadow-[0_6px_22px_color-mix(in_srgb,var(--color-warning)_14%,transparent)]',
  'before:pointer-events-none before:absolute before:inset-0 before:content-[""] before:[background:radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--color-warning)_16%,transparent),transparent_58%)]'
)

export const dashboardRemindersHeaderClass = cn(
  'relative z-[1] mb-2 flex items-center justify-between gap-2',
  '[&_.dashboard-reminders-title-wrap]:flex [&_.dashboard-reminders-title-wrap]:min-w-0 [&_.dashboard-reminders-title-wrap]:items-center [&_.dashboard-reminders-title-wrap]:gap-2'
)

export const dashboardRemindersIconClass = cn(
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
  'border border-[var(--color-warning-border)] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-surface))] text-[var(--color-warning)]',
  '[&_.app-icon]:h-4 [&_.app-icon]:w-4'
)

export const dashboardRemindersTitleClass =
  'text-[0.82rem] font-bold text-[var(--color-warning)] [.card-header-row_&]:mb-0'

export const dashboardRemindersHintClass =
  'relative z-[1] mb-2 text-[0.72rem] leading-[1.55] text-[color-mix(in_srgb,var(--color-warning)_72%,var(--color-text))]'

export const dashboardRemindersListClass = 'relative z-[1] flex flex-col'

export const dashboardReminderRowClass = cn(
  'flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-warning-border)_70%,transparent)] py-[0.55rem] last:border-b-0',
  'animate-[fadeInUp_0.35s_var(--ease-page)_both]'
)

export const dashboardReminderMainClass = 'min-w-0 flex-1'

export const dashboardReminderTitleClass =
  'truncate text-[0.8rem] font-semibold text-[color-mix(in_srgb,var(--color-warning)_82%,var(--color-text))]'

export const dashboardReminderMetaClass = 'mt-[0.15rem] text-[0.72rem] text-muted'
