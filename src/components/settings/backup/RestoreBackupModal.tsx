import { useId } from 'react'
import { createPortal } from 'react-dom'

import type { RestoreStage } from './useBackupRestore'
import { useModalLock } from '../../../hooks/useModalLock'
import type { RestoreMode } from '../../../services/backupPlan'
import type { RestorePreview, RestoreProgress } from '../../../services/backupRestore'
import { formatBackupSummary, formatIgnoredTabs } from '../../../services/backupSummary'
import { cn } from '../../../utils/cn'
import AppIcon from '../../AppIcon'
import ProgressBar from '../../ProgressBar'
import {
  backupModeGroupClass,
  backupModeHintClass,
  backupModeOptionClass,
  backupModeTitleClass,
  backupNoteClass,
  backupProgressLabelClass,
  backupSummaryClass
} from '../../ui/backupStyles'
import Button from '../../ui/Button'
import { formActionsClassName } from '../../ui/formStyles'
import {
  formModalActionsClass,
  formModalBackdropClass,
  formModalBodyClass,
  formModalCloseClass,
  formModalHeaderClass,
  formModalPanelClass,
  formModalRootClass,
  formModalTitleClass
} from '../../ui/modalStyles'

const MODES: { id: RestoreMode; title: string; hint: string }[] = [
  {
    id: 'merge',
    title: 'ادغام',
    hint: 'ردیف‌های تازه اضافه می‌شوند؛ ردیفی که شناسه‌اش در شیت هست رد می‌شود. چیزی پاک نمی‌شود.'
  },
  {
    id: 'replace',
    title: 'جایگزین',
    hint: 'هر تب پاک می‌شود و ردیف‌های پشتیبان جایش نوشته می‌شود.'
  }
]

const CONFIRM_MESSAGE: Record<RestoreMode, string> = {
  merge: 'ردیف‌های تازه‌ی پشتیبان به شیت فعال اضافه می‌شوند. ادامه می‌دهی؟',
  replace:
    'داده‌های فعلی هر تبِ این پشتیبان در شیت فعال پاک و با محتوای فایل جایگزین می‌شود. این کار برگشت ندارد. ادامه می‌دهی؟'
}

const TITLES: Record<Exclude<RestoreStage, 'closed'>, string> = {
  preview: 'بازیابی از پشتیبان',
  confirm: 'تأیید بازیابی',
  running: 'در حال بازیابی',
  done: 'نتیجه بازیابی'
}

export interface RestoreBackupModalProps {
  stage: RestoreStage
  preview: RestorePreview | null
  mode: RestoreMode
  progress: RestoreProgress | null
  result: string
  onModeChange: (mode: RestoreMode) => void
  onNext: () => void
  onBack: () => void
  onConfirm: () => void
  onClose: () => void
}

function faCount(value: number): string {
  return value.toLocaleString('fa-IR')
}

function PreviewBody({
  preview,
  mode,
  onModeChange
}: Pick<RestoreBackupModalProps, 'mode' | 'onModeChange'> & { preview: RestorePreview }) {
  const ignored = formatIgnoredTabs(preview.unknownTabs, true)

  return (
    <>
      <p className={backupSummaryClass}>{formatBackupSummary(preview)}</p>
      {preview.manifest.spreadsheetLabel ? (
        <p className={backupNoteClass}>از شیت «{preview.manifest.spreadsheetLabel}»</p>
      ) : null}
      {ignored ? <p className={backupNoteClass}>{ignored}</p> : null}
      <div className={backupModeGroupClass} role="radiogroup" aria-label="نوع بازیابی">
        {MODES.map(option => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={mode === option.id}
            className={backupModeOptionClass(mode === option.id)}
            onClick={() => onModeChange(option.id)}
          >
            <span className={backupModeTitleClass}>{option.title}</span>
            <span className={backupModeHintClass}>{option.hint}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function ProgressBody({ progress }: { progress: RestoreProgress | null }) {
  const total = progress?.total ?? 0
  const done = progress?.done ?? 0
  const label = progress?.tab
    ? `«${progress.tab}» (${faCount(done + 1)} از ${faCount(total)})`
    : 'آماده‌سازی…'

  return (
    <>
      <p className={backupProgressLabelClass}>{label}</p>
      <ProgressBar
        value={total ? (done / total) * 100 : 0}
        shimmer={false}
        aria-label="پیشرفت بازیابی"
      />
    </>
  )
}

function StageBody(props: RestoreBackupModalProps) {
  const { stage, preview, mode } = props

  if (stage === 'preview' && preview) return <PreviewBody {...props} preview={preview} />
  if (stage === 'confirm') return <p className={backupNoteClass}>{CONFIRM_MESSAGE[mode]}</p>
  if (stage === 'running') return <ProgressBody progress={props.progress} />

  return <p className={backupNoteClass}>{props.result}</p>
}

function StageActions(props: RestoreBackupModalProps) {
  const { stage, mode } = props

  if (stage === 'preview') {
    return (
      <>
        <Button type="button" variant="primary" onClick={props.onNext}>
          ادامه
        </Button>
        <Button type="button" variant="secondary" onClick={props.onClose}>
          انصراف
        </Button>
      </>
    )
  }
  if (stage === 'confirm') {
    return (
      <>
        <Button
          type="button"
          variant={mode === 'replace' ? 'danger' : 'primary'}
          onClick={props.onConfirm}
        >
          {mode === 'replace' ? 'بله، جایگزین کن' : 'بله، ادغام کن'}
        </Button>
        <Button type="button" variant="secondary" onClick={props.onBack}>
          برگشت
        </Button>
      </>
    )
  }

  return (
    <Button type="button" variant="primary" disabled={stage === 'running'} onClick={props.onClose}>
      متوجه شدم
    </Button>
  )
}

export default function RestoreBackupModal(props: RestoreBackupModalProps) {
  const { stage, onClose } = props
  const open = stage !== 'closed'
  const running = stage === 'running'
  const { panelRef } = useModalLock({ open, onClose, blocked: running })
  const titleId = useId()

  if (!open) return null

  return createPortal(
    <div className={formModalRootClass} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className={formModalBackdropClass}
        onClick={onClose}
        disabled={running}
        aria-label="بستن"
      />
      <div ref={panelRef} className={formModalPanelClass}>
        <div className={formModalHeaderClass}>
          <h2 id={titleId} className={formModalTitleClass}>
            {TITLES[stage]}
          </h2>
          <button
            type="button"
            className={formModalCloseClass}
            onClick={onClose}
            disabled={running}
            aria-label="بستن"
            data-modal-close
          >
            <AppIcon name="close" size={18} />
          </button>
        </div>
        <div className={formModalBodyClass} aria-busy={running} aria-live="polite">
          <StageBody {...props} />
        </div>
        <div className={cn(formModalActionsClass, formActionsClassName())}>
          <StageActions {...props} />
        </div>
      </div>
    </div>,
    document.body
  )
}
