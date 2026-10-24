import { type FormEvent, useEffect, useState } from 'react'

import CategoryRewriteProgress from './CategoryRewriteProgress'
import type { RewriteProgress } from '../../services/categoryRewrite'
import { formatPersianNumber } from '../../utils/formatMoney'
import { showError } from '../../utils/toast'
import { FormField, Select } from '../form'
import FormModal from '../FormModal'
import { formHintClass } from '../ui/formStyles'

export interface MergeRequest {
  source: string
  /** Rows under the source that move to the target. */
  rowCount: number
  /** Opened from «حذف» on a category that has rows. */
  fromDelete: boolean
}

interface CategoryMergeModalProps {
  request: MergeRequest | null
  categories: string[]
  busy: boolean
  progress: RewriteProgress | null
  onClose: () => void
  onConfirm: (source: string, target: string) => Promise<boolean>
}

/** «ادغام در دسته دیگر…»: pick the target, read «۳۱ رکورد به «خانه» منتقل می‌شود», confirm. */
export default function CategoryMergeModal({
  request,
  categories,
  busy,
  progress,
  onClose,
  onConfirm
}: CategoryMergeModalProps) {
  const [target, setTarget] = useState('')
  const options = categories.filter(name => name !== request?.source)

  useEffect(() => setTarget(''), [request?.source])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!request) return
    if (!target) {
      showError('دسته مقصد را انتخاب کن')

      return
    }
    if (await onConfirm(request.source, target)) onClose()
  }

  const rows = formatPersianNumber(request?.rowCount ?? 0)

  return (
    <FormModal
      open={request != null}
      title={request ? `ادغام «${request.source}»` : ''}
      onClose={() => !busy && onClose()}
      onSubmit={handleSubmit}
      saving={busy}
      saveLabel="ادغام و انتقال"
      variant="panel"
    >
      {request?.fromDelete ? (
        <p className={formHintClass}>
          {`«${request.source}» ${rows} رکورد دارد؛ برای حذف، اول آن‌ها را به دسته دیگری منتقل کن.`}
        </p>
      ) : null}
      <FormField label="انتقال به" required controlWidth="full">
        <Select
          value={target}
          onChange={setTarget}
          options={[
            { value: '', label: 'انتخاب دسته', disabled: true },
            ...options.map(name => ({ value: name, label: name }))
          ]}
          aria-label="دسته مقصد"
          disabled={busy}
        />
      </FormField>
      {request && target ? (
        <p className="m-0 text-[0.84rem] font-semibold text-text">
          {`${rows} رکورد به «${target}» منتقل می‌شود و «${request.source}» حذف می‌شود.`}
        </p>
      ) : null}
      <CategoryRewriteProgress progress={progress} />
    </FormModal>
  )
}
