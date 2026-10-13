import { useParams, useSearchParams } from 'react-router'

import { LazyLineItemPage } from './lazyPages'
import type { LineItemsReportType } from '../services/lineItemsReport'

function parseType(value: string | null): LineItemsReportType {
  return value === 'income' || value === 'all' ? value : 'expense'
}

/** `/reports/line-items/:itemKey?type=` — the item page of «گزارش اقلام». */
export default function LineItemRoute() {
  const { itemKey = '' } = useParams<{ itemKey: string }>()
  const [searchParams] = useSearchParams()

  return <LazyLineItemPage itemKey={itemKey} type={parseType(searchParams.get('type'))} />
}
