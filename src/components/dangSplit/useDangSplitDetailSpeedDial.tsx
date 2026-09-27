import { useMemo } from 'react'

import type { DangSplitDetailTab } from './types'
import type { PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { useRegisterPageSpeedDial } from '../../hooks/usePageSpeedDial'
import { exportDangSplitSummaryPdf } from '../../services/dangSplitExport'
import { isConfigured } from '../../services/settings'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import { showError } from '../../utils/toast'
import SpeedDialIcon from '../SpeedDialIcon'

/**
 * اسپید دیال وابسته به تب: در جمع‌بندی اول افزودن اقلام، بعد افزودن افراد و سپس
 * بروزرسانی و خروجی. در تب افراد و اقلام، دکمه اول همان چیزی است که تب می‌سازد.
 */
export function useDangSplitDetailSpeedDial({
  active,
  detailTab,
  groupTitle,
  summary,
  loading,
  onAddExpense,
  onAddPerson,
  onAddCategory,
  onRefresh
}: {
  active: boolean
  detailTab: DangSplitDetailTab
  groupTitle: string
  summary: DangSplitGroupSummary
  loading: boolean
  onAddExpense: () => void
  onAddPerson: () => void
  onAddCategory: () => void
  onRefresh: () => void
}) {
  const config = useMemo(() => {
    const addExpense: PageSpeedDialAction = {
      id: 'add-expense',
      label: 'افزودن اقلام',
      icon: <SpeedDialIcon name="add" />,
      onClick: onAddExpense
    }
    const addPerson: PageSpeedDialAction = {
      id: 'add-person',
      label: 'افزودن افراد',
      icon: <SpeedDialIcon name="add" />,
      onClick: onAddPerson
    }
    const addCategory: PageSpeedDialAction = {
      id: 'add-category',
      label: 'افزودن دسته',
      icon: <SpeedDialIcon name="add" />,
      onClick: onAddCategory
    }
    const refresh: PageSpeedDialAction = {
      id: 'refresh',
      label: 'بروزرسانی',
      icon: <SpeedDialIcon name="refresh" />,
      onClick: onRefresh,
      disabled: loading
    }
    const exportSummary: PageSpeedDialAction = {
      id: 'export-summary',
      label: 'خروجی جمع‌بندی',
      icon: <SpeedDialIcon name="pdf" />,
      onClick: () => {
        void exportDangSplitSummaryPdf(groupTitle, summary).catch(err =>
          showError(err instanceof Error ? err.message : 'خروجی ناموفق بود')
        )
      },
      disabled: summary.people.length === 0
    }

    const actions: PageSpeedDialAction[] =
      detailTab === 'people'
        ? [addPerson, addCategory, refresh, exportSummary]
        : detailTab === 'expenses'
        ? [addExpense, addPerson, refresh, exportSummary]
        : [addExpense, addPerson, refresh, exportSummary]

    return { ariaLabel: 'عملیات دنگ', actions }
  }, [detailTab, groupTitle, loading, onAddCategory, onAddExpense, onAddPerson, onRefresh, summary])

  useRegisterPageSpeedDial(isConfigured() ? config : null, active)
}
