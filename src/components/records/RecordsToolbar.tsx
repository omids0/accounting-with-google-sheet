import type { CustomForm } from '../../types'
import TransactionTypeSegment, { transactionTypeOptionsFromForms } from '../TransactionTypeSegment'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  recordsRefreshBtnClass,
  recordsToolbarClass,
  recordsToolbarHeaderClass,
  recordsToolbarHeadingClass,
  recordsToolbarTitleClass
} from '../ui/recordsStyles'

interface RecordsToolbarProps {
  loading: boolean
  forms: CustomForm[]
  activeFormId: string
  onRefresh: () => void
  onFormChange: (formId: string) => void
}

export default function RecordsToolbar({
  loading,
  forms,
  activeFormId,
  onRefresh,
  onFormChange
}: RecordsToolbarProps) {
  return (
    <Card className={recordsToolbarClass}>
      <div className={recordsToolbarHeaderClass}>
        <div className={recordsToolbarHeadingClass}>
          <h2 className={recordsToolbarTitleClass}>تراکنش‌ها</h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={recordsRefreshBtnClass}
          onClick={onRefresh}
          disabled={loading}
          aria-label="بارگذاری مجدد"
        >
          {loading ? '...' : '↻'}
        </Button>
      </div>

      <TransactionTypeSegment
        options={transactionTypeOptionsFromForms(forms, { includeAll: true })}
        value={activeFormId}
        onChange={onFormChange}
      />
    </Card>
  )
}
