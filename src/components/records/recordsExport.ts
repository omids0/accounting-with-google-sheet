import { getFormField, type StoredRecord } from './recordsUtils'
import type { CustomForm } from '../../types'
import { downloadTextFile, rowsToCsv } from '../../utils/csv'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { parseNumeric } from '../../utils/parseNumeric'
import { downloadTablePdf } from '../../utils/pdf'
import { SUBCATEGORY_FIELD_ID } from '../form'

const HEADERS = ['فرم', 'تاریخ', 'عنوان', 'دسته', 'زیردسته', 'مبلغ', 'توضیحات']

export function recordsExportRows(records: StoredRecord[], forms: CustomForm[]): string[][] {
  return records.map(record => {
    const form = forms.find(item => item.id === record.formId)

    const dateFieldId = (form && getFormField(form, 'date')?.id) || 'date'

    const date = record.values[dateFieldId] ?? ''

    return [
      record.formName,
      date ? formatIsoDatePersian(date) : '',
      record.values.title ?? '',
      record.values.category ?? '',
      record.values[SUBCATEGORY_FIELD_ID] ?? '',
      formatMoney(parseNumeric(record.values.amount)),
      record.values.note ?? ''
    ]
  })
}

export function exportRecordsCsv(records: StoredRecord[], forms: CustomForm[]): void {
  downloadTextFile('تراکنش‌ها.csv', rowsToCsv(HEADERS, recordsExportRows(records, forms)))
}

export async function exportRecordsPdf(
  records: StoredRecord[],
  forms: CustomForm[]
): Promise<void> {
  const rows = recordsExportRows(records, forms)

  await downloadTablePdf({
    title: 'گزارش تراکنش‌ها',
    headers: HEADERS,
    rows,
    filename: 'تراکنش‌ها.pdf',
    cellClasses: rows.map(() => ['', '', '', '', '', 'pdf-cell-amount', ''])
  })
}
