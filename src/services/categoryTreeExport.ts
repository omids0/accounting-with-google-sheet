import type { CategoryTreeNode, CategoryTreeType } from './categoryTreeReport'
import { downloadTextFile, rowsToCsv } from '../utils/csv'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'

const HEADERS = ['نوع', 'دسته', 'زیردسته', 'تعداد', 'مبلغ']

const TYPE_LABELS: Record<CategoryTreeType, string> = {
  income: 'درآمد',
  expense: 'هزینه'
}

/** One row per category, followed by one row per subcategory of that category. */
export function categoryTreeRows(nodes: CategoryTreeNode[]): string[][] {
  const rows: string[][] = []

  for (const node of nodes) {
    const typeLabel = TYPE_LABELS[node.type]

    rows.push([
      typeLabel,
      node.category,
      '',
      node.count.toLocaleString('fa-IR'),
      formatMoney(node.total)
    ])

    for (const child of node.children) {
      rows.push([
        typeLabel,
        node.category,
        child.name,
        child.count.toLocaleString('fa-IR'),
        formatMoney(child.total)
      ])
    }
  }

  return rows
}

export function exportCategoryTreeCsv(nodes: CategoryTreeNode[]): void {
  downloadTextFile('درختواره-درآمد-هزینه.csv', rowsToCsv(HEADERS, categoryTreeRows(nodes)))
}

export async function exportCategoryTreePdf(nodes: CategoryTreeNode[]): Promise<void> {
  const rows = categoryTreeRows(nodes)

  await downloadTablePdf({
    title: 'درختواره درآمد و هزینه',
    headers: HEADERS,
    rows,
    filename: 'درختواره-درآمد-هزینه.pdf',
    cellClasses: rows.map(() => ['', '', '', '', 'pdf-cell-amount'])
  })
}
