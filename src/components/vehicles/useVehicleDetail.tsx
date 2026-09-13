import { useCallback, useEffect, useMemo, useState } from 'react'

import type { VehicleDeleteTarget, VehicleProfileWithRow } from './types'
import { createVehicleDetailHandlers } from './useVehicleDetailHandlers'
import {
  buildDeadlineListItem,
  buildPeriodicListItem,
  shouldPromptMileageUpdate,
  sortActiveItems
} from './utils'
import type { DeadlineWithRow, HistoryWithRow, PeriodicWithRow } from './vehicleDetailMutations'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import type { PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { syncCategoriesFromSheet } from '../../services/categories'
import { fetchReminderRules } from '../../services/reminders'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { fetchVehicleDeadlines } from '../../services/vehicleDeadlines'
import { fetchVehicleHistory } from '../../services/vehicleHistory'
import { getVehicleMechanicCategories } from '../../services/vehicleMechanicCategories'
import { getVehiclePeriodicCategories } from '../../services/vehiclePeriodicCategories'
import { fetchVehiclePeriodicServices } from '../../services/vehiclePeriodicServices'
import { fetchVehicles } from '../../services/vehicleProfiles'
import type { VehicleActiveListItem } from '../../types/vehicles'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import AppIcon from '../AppIcon'
import SpeedDialIcon from '../SpeedDialIcon'

export function useVehicleDetail(vehicle: VehicleProfileWithRow) {
  const [currentVehicle, setCurrentVehicle] = useState(vehicle)
  const [activeItems, setActiveItems] = useState<VehicleActiveListItem[]>([])
  const [history, setHistory] = useState<HistoryWithRow[]>([])
  const [detailTab, setDetailTab] = useState<'active' | 'history'>('active')
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
  const [deletingTarget, setDeletingTarget] = useState<VehicleDeleteTarget | null>(null)
  const [deleteLinkedExpense, setDeleteLinkedExpense] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<string[]>(() => getVehiclePeriodicCategories())
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
        deletingTarget,
        deleteLinkedExpense,
        setSaving,
        setDeleting,
        setDeletingTarget,
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
      deletingTarget,
      deleteLinkedExpense,
      loadDetail
    ]
  )

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: `عملیات ${currentVehicle.title}`,
      actions: [
        {
          id: 'periodic',
          label: 'سرویس دوره‌ای',
          icon: <AppIcon name="settings" size={18} />,
          onClick: () => {
            setEditingPeriodic(null)
            setShowPeriodicForm(true)
          }
        },
        {
          id: 'deadline',
          label: 'موعد',
          icon: <AppIcon name="clock" size={18} />,
          onClick: () => {
            setEditingDeadline(null)
            setRenewingDeadline(false)
            setShowDeadlineForm(true)
          }
        },
        {
          id: 'mechanic',
          label: 'مکانیک',
          icon: <AppIcon name="settings" size={18} />,
          onClick: () => setShowMechanicForm(true)
        },
        {
          id: 'mileage',
          label: 'کارکرد',
          icon: <AppIcon name="clock" size={18} />,
          onClick: () => setShowMileageModal(true)
        },
        {
          id: 'refresh',
          label: 'بروزرسانی',
          icon: <SpeedDialIcon name="refresh" />,
          onClick: loadDetail,
          disabled: loading
        }
      ] as PageSpeedDialAction[]
    }),
    [currentVehicle.title, loadDetail, loading]
  )

  return {
    currentVehicle,
    activeItems,
    history,
    detailTab,
    setDetailTab,
    loading,
    saving,
    deleting,
    showPeriodicForm,
    editingPeriodic,
    showDeadlineForm,
    editingDeadline,
    renewingDeadline,
    showCompleteModal,
    completingPeriodic,
    showMechanicForm,
    showMileageModal,
    deletingTarget,
    deleteLinkedExpense,
    setDeleteLinkedExpense,
    serviceTypes,
    setServiceTypes,
    mechanicCategories,
    setMechanicCategories,
    loadDetail,
    pageSpeedDialConfig,
    ...handlers,
    closePeriodicForm: () => {
      if (saving) return
      setShowPeriodicForm(false)
      setEditingPeriodic(null)
    },
    closeDeadlineForm: () => {
      if (saving) return
      setShowDeadlineForm(false)
      setEditingDeadline(null)
      setRenewingDeadline(false)
    },
    openDeleteTarget: (target: VehicleDeleteTarget) => {
      setDeletingTarget(target)
      setDeleteLinkedExpense(Boolean(target.item.expenseRecordId))
    },
    closeDeleteTarget: () => {
      if (deleting) return
      setDeletingTarget(null)
    },
    openComplete: (item: VehicleActiveListItem) => {
      if (!item.periodic) return
      setCompletingPeriodic(item.periodic)
      setShowCompleteModal(true)
    },
    openPeriodicEdit: (item: VehicleActiveListItem) => {
      if (!item.periodic) return
      setEditingPeriodic(item.periodic)
      setShowPeriodicForm(true)
    },
    openDeadlineEdit: (item: VehicleActiveListItem) => {
      if (!item.deadline) return
      setEditingDeadline(item.deadline)
      setRenewingDeadline(false)
      setShowDeadlineForm(true)
    },
    openDeadlineRenew: (item: VehicleActiveListItem) => {
      if (!item.deadline) return
      setEditingDeadline(item.deadline)
      setRenewingDeadline(true)
      setShowDeadlineForm(true)
    },
    closeCompleteModal: () => {
      if (saving) return
      setShowCompleteModal(false)
      setCompletingPeriodic(null)
    },
    closeMechanicForm: () => {
      if (saving) return
      setShowMechanicForm(false)
    },
    closeMileageModal: () => {
      if (saving) return
      setShowMileageModal(false)
    }
  }
}
