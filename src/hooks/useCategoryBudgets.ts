import { useCallback, useEffect, useState } from 'react'

import { useDataRefresh } from './useDataRefresh'
import { budgetMap } from '../services/budgets'
import { fetchBudgets } from '../services/budgetsSheet'
import { getSettings } from '../services/settings'

/**
 * Monthly budgets by category (reloaded after any sheet change) and which category's
 * budget sheet is open. Pair with `BudgetSheet`.
 */
export function useCategoryBudgets(enabled = true) {
  const [budgets, setBudgets] = useState<Map<string, number>>(() => new Map())
  const [editing, setEditing] = useState<string | null>(null)
  const revision = useDataRefresh()

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!enabled || !spreadsheetId) return

    let live = true

    void fetchBudgets(spreadsheetId).then(list => live && setBudgets(budgetMap(list)))

    return () => {
      live = false
    }
  }, [enabled, revision])

  const openBudget = useCallback((category: string) => setEditing(category), [])
  const closeBudget = useCallback(() => setEditing(null), [])

  return { budgets, editing, openBudget, closeBudget }
}
