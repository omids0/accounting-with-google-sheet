import { useCallback, useEffect, useMemo, useState } from 'react'

import { exportCategoryTreeCsv, exportCategoryTreePdf } from '../../../services/categoryTreeExport'
import {
  loadCategoryTreeReport,
  sumCategoryTree,
  type CategoryTreeNode
} from '../../../services/categoryTreeReport'
import { getSettings, isConfigured } from '../../../services/settings'
import { requireAuth } from '../../../utils/authGuard'
import { isOtherCategory } from '../../../utils/categoryOrdering'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'
import { useReportDateFilter } from '../ReportToolbar'

export type CategoryTreeFilter = 'all' | 'income' | 'expense'

/** A category whose only subcategory is the «سایر» fallback has nothing to open. */
function isExpandable(node: CategoryTreeNode): boolean {
  if (node.children.length > 1) return true

  return node.children.length === 1 && !isOtherCategory(node.children[0].name)
}

export function useCategoryTreeReport() {
  const [nodes, setNodes] = useState<CategoryTreeNode[]>([])

  const [loading, setLoading] = useState(false)

  const [typeFilter, setTypeFilter] = useState<CategoryTreeFilter>('all')

  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const [exporting, setExporting] = useState(false)

  const { datePreset, customRange, handleDateFilterChange, dateRange } = useReportDateFilter()

  const load = useCallback(async () => {
    if (!isConfigured() || !requireAuth()) return

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    setLoading(true)
    try {
      const data = await loadCategoryTreeReport(spreadsheetId, dateRange)

      setNodes(data.nodes)
      setExpandedIds([])
    } catch (err) {
      if (handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری' })) return
    } finally {
      setLoading(false)
    }
  }, [dateRange.start, dateRange.end])

  useEffect(() => {
    load()
  }, [load])

  const visibleNodes = useMemo(
    () => (typeFilter === 'all' ? nodes : nodes.filter(node => node.type === typeFilter)),
    [nodes, typeFilter]
  )

  const incomeTotal = useMemo(() => sumCategoryTree(nodes, 'income'), [nodes])

  const expenseTotal = useMemo(() => sumCategoryTree(nodes, 'expense'), [nodes])

  const incomeNodes = useMemo(
    () => visibleNodes.filter(node => node.type === 'income'),
    [visibleNodes]
  )

  const expenseNodes = useMemo(
    () => visibleNodes.filter(node => node.type === 'expense'),
    [visibleNodes]
  )

  const expandableNodes = useMemo(() => visibleNodes.filter(isExpandable), [visibleNodes])

  const expanded = useMemo(() => new Set(expandedIds), [expandedIds])

  const allExpanded =
    expandableNodes.length > 0 && expandableNodes.every(node => expanded.has(node.id))

  const toggleNode = useCallback((id: string) => {
    setExpandedIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    )
  }, [])

  const toggleAll = useCallback(() => {
    setExpandedIds(allExpanded ? [] : expandableNodes.map(node => node.id))
  }, [allExpanded, expandableNodes])

  const exportCsv = useCallback(() => {
    exportCategoryTreeCsv(visibleNodes)
    showSuccess('خروجی اکسل آماده شد')
  }, [visibleNodes])

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      await exportCategoryTreePdf(visibleNodes)
      showSuccess('خروجی PDF آماده شد')
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ساخت خروجی PDF' })
    } finally {
      setExporting(false)
    }
  }, [visibleNodes])

  return {
    nodes: visibleNodes,
    incomeNodes,
    expenseNodes,
    incomeTotal,
    expenseTotal,
    isExpandable,
    canToggleAll: expandableNodes.length > 0,
    loading,
    exporting,
    typeFilter,
    setTypeFilter,
    expanded,
    allExpanded,
    toggleNode,
    toggleAll,
    datePreset,
    customRange,
    handleDateFilterChange,
    load,
    exportCsv,
    exportPdf
  }
}
