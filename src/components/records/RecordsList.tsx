import { getFormField, type StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import TransactionListItem from '../TransactionListItem'

interface RecordsListProps {
  forms: CustomForm[]
  activeForm?: CustomForm
  isAllForms: boolean
  filteredRecords: StoredRecord[]
  onEdit: (record: StoredRecord) => void
  onDelete: (record: StoredRecord) => void
}

export default function RecordsList({
  forms,
  activeForm,
  isAllForms,
  filteredRecords,
  onEdit,
  onDelete
}: RecordsListProps) {
  return (
    <div className="card records-list-card">
      <div className="records-list-header">
        <span className="records-list-count">
          {filteredRecords.length.toLocaleString('fa-IR')} مورد
        </span>
        {forms.length === 1 && activeForm && (
          <span className={`records-list-type records-list-type--${activeForm.type}`}>
            {activeForm.name}
          </span>
        )}
      </div>
      {filteredRecords.map((record, index) => {
        const form = forms.find(f => f.id === record.formId)

        if (!form) return null

        const recordAmountField = getFormField(form, 'amount')

        const recordTitleField = getFormField(form, 'title')

        const recordCategoryField = getFormField(form, 'category')

        const recordDateField = getFormField(form, 'date')

        const amount = recordAmountField ? record.values[recordAmountField.id] : ''

        const title = recordTitleField
          ? record.values[recordTitleField.id]
          : Object.values(record.values)[0] ?? ''

        const category = recordCategoryField ? record.values[recordCategoryField.id] : ''

        const date = recordDateField ? record.values[recordDateField.id] : ''

        const isIncome = form.type === 'income'

        return (
          <TransactionListItem
            key={`${record.formId}-${record.id}`}
            title={String(title)}
            meta={
              <>
                {isAllForms && `${record.formName} · `}
                {date ? formatIsoDatePersian(date) : record.createdAt}
                {category && ` · ${category}`}
              </>
            }
            tone={isIncome ? 'income' : form.type === 'expense' ? 'expense' : 'neutral'}
            index={index}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {amount && (
                <div
                  className={
                    isIncome ? 'amount-income' : form.type === 'expense' ? 'amount-expense' : ''
                  }
                  dir="ltr"
                >
                  {isIncome ? '+' : form.type === 'expense' ? '-' : ''}
                  {formatMoney(parseNumeric(amount))}
                </div>
              )}
              <div className="card-action-buttons">
                <CardEditButton onClick={() => onEdit(record)} />
                <CardDeleteButton onClick={() => onDelete(record)} />
              </div>
            </div>
          </TransactionListItem>
        )
      })}
    </div>
  )
}
