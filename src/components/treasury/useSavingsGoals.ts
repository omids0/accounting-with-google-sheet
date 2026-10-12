import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { nextGoalStatus } from '../../services/savingsGoals'
import {
  exportSavingsGoalsCsv,
  importSavingsGoalsCsv,
  loadSavingsGoals,
  moveGoalMoney,
  saveSavingsGoal,
  stripView,
  sumGoalBalances,
  type GoalMoveInput
} from '../../services/savingsGoalsSheet'
import { getSettings, isConfigured } from '../../services/settings'
import type { SavingsGoal, SavingsGoalView } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'

export type GoalMoveMode = 'deposit' | 'withdraw'

/** «هدف‌ها» in «صندوقچه»: goals with balances, the forms they open and their CSV. */
export function useSavingsGoals(active: boolean) {
  const [goals, setGoals] = useState<SavingsGoalView[]>([])
  /** `null` closed; `'new'` create; a goal to edit. */
  const [editing, setEditing] = useState<SavingsGoalView | 'new' | null>(null)
  const [moving, setMoving] = useState<{ goal: SavingsGoalView; mode: GoalMoveMode } | null>(null)
  const [saving, setSaving] = useState(false)
  const revision = useDataRefresh()

  const reload = useCallback(async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (spreadsheetId) setGoals(await loadSavingsGoals(spreadsheetId))
  }, [])

  useEffect(() => {
    if (active && isConfigured()) void reload()
  }, [active, reload, revision])

  const run = useCallback(
    async (action: (spreadsheetId: string) => Promise<void>, fallbackMessage: string) => {
      const spreadsheetId = getSettings()?.spreadsheetId

      if (!spreadsheetId || !requireAuth()) return false

      setSaving(true)
      try {
        await action(spreadsheetId)
        await reload()

        return true
      } catch (err) {
        handleSheetError(err, { fallbackMessage })

        return false
      } finally {
        setSaving(false)
      }
    },
    [reload]
  )

  const saveGoal = useCallback(
    async (goal: SavingsGoal, rowNumber?: number) => {
      const done = await run(id => saveSavingsGoal(id, goal, rowNumber), 'خطا در ذخیره هدف')

      if (done) {
        showSuccess(rowNumber ? 'هدف ذخیره شد' : 'هدف ساخته شد')
        setEditing(null)
      }
    },
    [run]
  )

  const setStatus = useCallback(
    (goal: SavingsGoalView, status: SavingsGoal['status']) =>
      saveGoal(
        {
          ...stripView(goal),
          // Back from the archive, a full goal is «reached» again.
          status: status === 'archived' ? status : nextGoalStatus({ ...goal, status }, goal.balance)
        },
        goal.rowNumber
      ),
    [saveGoal]
  )

  const moveMoney = useCallback(
    async (goal: SavingsGoalView, input: GoalMoveInput) => {
      let congratulate = false
      const done = await run(async id => {
        congratulate = await moveGoalMoney(id, goal, input)
      }, 'خطا در ثبت واریز')

      if (!done) return
      setMoving(null)
      showSuccess(input.amount > 0 ? 'به هدف واریز شد' : 'از هدف برداشت شد')
      if (congratulate) {
        const { showGoalReachedNotification } = await import('../../services/localNotifications')

        void showGoalReachedNotification(goal.id, goal.title).catch(() => undefined)
      }
    },
    [run]
  )

  const { handleExport, handleImport, importExportConfirmModal } = useSheetImportExport({
    exportFn: exportSavingsGoalsCsv,
    importFn: importSavingsGoalsCsv,
    onComplete: reload
  })

  const visibleGoals = useMemo(() => goals.filter(goal => goal.status !== 'archived'), [goals])

  return {
    goals,
    /** Active and reached goals: the «هدف‌ها» chip count and the cards in «همه». */
    visibleGoals,
    total: useMemo(() => sumGoalBalances(goals), [goals]),
    editing,
    setEditing,
    moving,
    setMoving,
    saving,
    saveGoal,
    setStatus,
    moveMoney,
    handleExport,
    handleImport,
    importExportConfirmModal
  }
}
