import { useCallback, useEffect, useMemo, useState } from 'react'

import { exportCategoryTreeCsv, exportCategoryTreePdf } from '../../../services/categoryTreeExport'
import { loadCategoryTreeReport, type CategoryTreeNode } from '../../../services/categoryTreeReport'
import { getSettings, isConfigured } from '../../../services/settings'
import { requireAuth } from '../../../utils/authGuard'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'
import { useReportDateFilter } from '../ReportToolbar'

export type CategoryTreeFilter = 'all' | 'income' | 'expense'

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

  const expanded = useMemo(() => new Set(expandedIds), [expandedIds])

  const allExpanded = visibleNodes.length > 0 && visibleNodes.every(node => expanded.has(node.id))

  const toggleNode = useCallback((id: string) => {
    setExpandedIds(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    )
  }, [])

  const toggleAll = useCallback(() => {
    setExpandedIds(allExpanded ? [] : visibleNodes.map(node => node.id))
  }, [allExpanded, visibleNodes])

  const total = useMemo(
    () => visibleNodes.reduce((sum, node) => sum + node.total, 0),
    [visibleNodes]
  )

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
    loading,
    exporting,
    typeFilter,
    setTypeFilter,
    expanded,
    allExpanded,
    toggleNode,
    toggleAll,
    total,
    datePreset,
    customRange,
    handleDateFilterChange,
    load,
    exportCsv,
    exportPdf
  }
}
