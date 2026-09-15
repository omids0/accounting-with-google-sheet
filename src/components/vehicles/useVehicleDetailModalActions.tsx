import { useMemo } from 'react'

import type { VehicleDeleteTarget } from './types'
import type { DeadlineWithRow, PeriodicWithRow } from './vehicleDetailMutations'
import type { PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import type { VehicleActiveListItem } from '../../types/vehicles'
import AppIcon from '../AppIcon'
import SpeedDialIcon from '../SpeedDialIcon'

type VehicleDetailModalActionsOptions = {
  vehicleTitle: string
  loading: boolean
  saving: boolean
  deleting: boolean
  loadDetail: () => Promise<void>
  setShowPeriodicForm: (open: boolean) => void
  setEditingPeriodic: (item: PeriodicWithRow | null) => void
  setShowDeadlineForm: (open: boolean) => void
  setEditingDeadline: (item: DeadlineWithRow | null) => void
  setRenewingDeadline: (value: boolean) => void
  setShowCompleteModal: (open: boolean) => void
  setCompletingPeriodic: (item: PeriodicWithRow | null) => void
  setShowMechanicForm: (open: boolean) => void
  setShowMileageModal: (open: boolean) => void
  setDeletingTarget: (target: VehicleDeleteTarget | null) => void
  setDeleteLinkedExpense: (value: boolean) => void
}

export function useVehicleDetailModalActions(options: VehicleDetailModalActionsOptions) {
  const {
    vehicleTitle,
    loading,
    saving,
    deleting,
    loadDetail,
    setShowPeriodicForm,
    setEditingPeriodic,
    setShowDeadlineForm,
    setEditingDeadline,
    setRenewingDeadline,
    setShowCompleteModal,
    setCompletingPeriodic,
    setShowMechanicForm,
    setShowMileageModal,
    setDeletingTarget,
    setDeleteLinkedExpense
  } = options

  const pageSpeedDialConfig = useMemo(
    () => ({
      ariaLabel: `عملیات ${vehicleTitle}`,
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
    [
      vehicleTitle,
      loadDetail,
      loading,
      setEditingDeadline,
      setEditingPeriodic,
      setRenewingDeadline,
      setShowDeadlineForm,
      setShowMechanicForm,
      setShowMileageModal,
      setShowPeriodicForm
    ]
  )

  return {
    pageSpeedDialConfig,
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
