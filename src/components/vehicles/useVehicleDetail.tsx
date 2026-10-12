import { useCallback, useEffect, useMemo, useState } from 'react'

import type { VehicleProfileWithRow } from './types'
import { useVehicleDetailDeletes } from './useVehicleDetailDeletes'
import { createVehicleDetailHandlers } from './useVehicleDetailHandlers'
import { useVehicleDetailModalActions } from './useVehicleDetailModalActions'
import {
  buildDeadlineListItem,
  buildPeriodicListItem,
  shouldPromptMileageUpdate,
  sortActiveItems
} from './utils'
import type { DeadlineWithRow, HistoryWithRow, PeriodicWithRow } from './vehicleDetailMutations'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { syncCategoriesFromSheet } from '../../services/categories'
import { fetchReminderRules } from '../../services/reminders'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { getVehicleDeadlineCategories } from '../../services/vehicleDeadlineCategories'
import { fetchVehicleDeadlines } from '../../services/vehicleDeadlines'
import { fetchVehicleHistory } from '../../services/vehicleHistory'
import { getVehicleMechanicCategories } from '../../services/vehicleMechanicCategories'
import { getVehiclePeriodicCategories } from '../../services/vehiclePeriodicCategories'
import { fetchVehiclePeriodicServices } from '../../services/vehiclePeriodicServices'
import { fetchVehicles } from '../../services/vehicleProfiles'
import {
  buildMonthlyFuelStats,
  fetchVehicleTransactions,
  filterFuelTransactions
} from '../../services/vehicleTransactions'
import type {
  MonthlyFuelStats,
  VehicleActiveListItem,
  VehicleTransactionItem
} from '../../types/vehicles'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'

export function useVehicleDetail(vehicle: VehicleProfileWithRow) {
  const [currentVehicle, setCurrentVehicle] = useState(vehicle)
  const [activeItems, setActiveItems] = useState<VehicleActiveListItem[]>([])
  const [history, setHistory] = useState<HistoryWithRow[]>([])
  const [detailTab, setDetailTab] = useState<
    'active' | 'deadlines' | 'history' | 'mileage' | 'transactions' | 'fuel'
  >('active')
  const [transactions, setTransactions] = useState<VehicleTransactionItem[]>([])
  const [fuelStats, setFuelStats] = useState<MonthlyFuelStats[]>([])
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [saving, setSaving] = useState(false)
  const [showPeriodicForm, setShowPeriodicForm] = useState(false)
  const [editingPeriodic, setEditingPeriodic] = useState<PeriodicWithRow | null>(null)
  const [showDeadlineForm, setShowDeadlineForm] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState<DeadlineWithRow | null>(null)
  const [renewingDeadline, setRenewingDeadline] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completingPeriodic, setCompletingPeriodic] = useState<PeriodicWithRow | null>(null)
  const [showMechanicForm, setShowMechanicForm] = useState(false)
  const [showMileageModal, setShowMileageModal] = useState(false)
  const [mileageReminderEnabled, setMileageReminderEnabled] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<string[]>(() => getVehiclePeriodicCategories())
  const [deadlineCategories, setDeadlineCategories] = useState<string[]>(() =>
    getVehicleDeadlineCategories()
  )
  const [mechanicCategories, setMechanicCategories] = useState<string[]>(() =>
    getVehicleMechanicCategories()
  )

  const dataRevision = useDataRefresh()

  const loadDetail = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await syncCategoriesFromSheet(spreadsheetId)
      setServiceTypes(getVehiclePeriodicCategories())
      setDeadlineCategories(getVehicleDeadlineCategories())
      setMechanicCategories(getVehicleMechanicCategories())

      const [vehicles, periodics, deadlines, historyItems, reminderRules] = await Promise.all([
        fetchVehicles(spreadsheetId),
        fetchVehiclePeriodicServices(spreadsheetId, vehicle.id),
        fetchVehicleDeadlines(spreadsheetId, vehicle.id),
        fetchVehicleHistory(spreadsheetId, vehicle.id),
        fetchReminderRules(spreadsheetId)
      ])

      setMileageReminderEnabled(
        reminderRules.find(rule => rule.kind === 'vehicle-mileage')?.enabled ?? false
      )

      const latestVehicle = vehicles.find(item => item.id === vehicle.id) ?? vehicle

      setCurrentVehicle(latestVehicle)
      setActiveItems(
        sortActiveItems([
          ...periodics.map(item => buildPeriodicListItem(item, latestVehicle.mileage)),
          ...deadlines.map(item => buildDeadlineListItem(item))
        ])
      )
      setHistory(historyItems)

      const transactionItems = await fetchVehicleTransactions(spreadsheetId, vehicle.id)

      setTransactions(transactionItems)
      setFuelStats(buildMonthlyFuelStats(filterFuelTransactions(transactionItems)))
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری جزئیات خودرو' })
    } finally {
      setLoading(false)
    }
  }, [vehicle])

  useEffect(() => {
    if (!isConfigured()) return

    void loadDetail()
  }, [loadDetail, dataRevision])

  useEffect(() => {
    if (!isConfigured() || showMileageModal) return

    if (
      mileageReminderEnabled &&
      shouldPromptMileageUpdate(
        currentVehicle.mileageReminderInterval,
        currentVehicle.lastMileageUpdate
      )
    ) {
      setShowMileageModal(true)
    }
  }, [
    currentVehicle.lastMileageUpdate,
    currentVehicle.mileageReminderInterval,
    mileageReminderEnabled,
    showMileageModal
  ])

  const handlers = useMemo(
    () =>
      createVehicleDetailHandlers({
        currentVehicle,
        editingPeriodic,
        completingPeriodic,
        editingDeadline,
        renewingDeadline,
        setSaving,
        loadDetail,
        onPeriodicSaved: () => {
          setShowPeriodicForm(false)
          setEditingPeriodic(null)
        },
        onDeadlineSaved: () => {
          setShowDeadlineForm(false)
          setEditingDeadline(null)
          setRenewingDeadline(false)
        },
        onCompleteSaved: () => {
          setShowCompleteModal(false)
          setCompletingPeriodic(null)
        },
        onMechanicSaved: () => setShowMechanicForm(false),
        onMileageSaved: () => setShowMileageModal(false)
      }),
    [
      currentVehicle,
      editingPeriodic,
      completingPeriodic,
      editingDeadline,
      renewingDeadline,
      loadDetail
    ]
  )

  const deletes = useVehicleDetailDeletes({ activeItems, history, transactions, loadDetail })

  const modalActions = useVehicleDetailModalActions({
    vehicleTitle: currentVehicle.title,
    loading,
    saving,
    loadDetail,
    setShowPeriodicForm,
    setEditingPeriodic,
    setShowDeadlineForm,
    setEditingDeadline,
    setRenewingDeadline,
    setShowCompleteModal,
    setCompletingPeriodic,
    setShowMechanicForm,
    setShowMileageModal
  })

  return {
    currentVehicle,
    // Lists hide the row waiting in the undo window; counts and filters read these.
    activeItems: deletes.visibleActiveItems,
    history: deletes.visibleHistory,
    transactions: deletes.visibleTransactions,
    fuelStats,
    detailTab,
    setDetailTab,
    loading,
    saving,
    requestDeleteTransaction: deletes.requestDeleteTransaction,
    showPeriodicForm,
    editingPeriodic,
    showDeadlineForm,
    editingDeadline,
    renewingDeadline,
    showCompleteModal,
    completingPeriodic,
    showMechanicForm,
    showMileageModal,
    deletingTarget: deletes.deletingTarget,
    deleteLinkedExpense: deletes.deleteLinkedExpense,
    setDeleteLinkedExpense: deletes.setDeleteLinkedExpense,
    openDeleteTarget: deletes.openDeleteTarget,
    closeDeleteTarget: deletes.closeDeleteTarget,
    handleDelete: deletes.handleDelete,
    serviceTypes,
    setServiceTypes,
    deadlineCategories,
    setDeadlineCategories,
    mechanicCategories,
    setMechanicCategories,
    loadDetail,
    ...handlers,
    ...modalActions
  }
}
