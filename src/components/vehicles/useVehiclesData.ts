import { useCallback, useEffect, useMemo, useState } from 'react'

import type { VehicleProfileFormState, VehicleProfileWithRow } from './types'
import {
  buildDeadlineListItem,
  buildPeriodicListItem,
  countActionNeeded,
  sortActiveItems,
  validateMileageIncrease
} from './utils'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { getSettings, isConfigured } from '../../services/settings'
import { hasStoreData } from '../../services/spreadsheetStore'
import { fetchAllVehicleDeadlines } from '../../services/vehicleDeadlines'
import { fetchAllVehiclePeriodicServices } from '../../services/vehiclePeriodicServices'
import {
  createVehicle,
  deleteVehicle,
  ensureVehiclesSheet,
  fetchVehicles,
  updateVehicle
} from '../../services/vehicleProfiles'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { parseNumeric } from '../../utils/parseNumeric'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'

export function useVehiclesData() {
  const [items, setItems] = useState<VehicleProfileWithRow[]>([])
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(() => {
    const settings = getSettings()

    return !(settings?.spreadsheetId && hasStoreData(settings.spreadsheetId))
  })
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<VehicleProfileWithRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState<VehicleProfileWithRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dataRevision = useDataRefresh()

  const loadItems = useCallback(async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setLoading(true)
    try {
      await ensureVehiclesSheet(spreadsheetId)

      const [vehicles, periodics, deadlines] = await Promise.all([
        fetchVehicles(spreadsheetId),
        fetchAllVehiclePeriodicServices(spreadsheetId),
        fetchAllVehicleDeadlines(spreadsheetId)
      ])

      const counts: Record<string, number> = {}

      for (const vehicle of vehicles) {
        if (!vehicle.active) continue

        const activeItems = sortActiveItems([
          ...periodics
            .filter(item => item.vehicleId === vehicle.id && item.active)
            .map(item => buildPeriodicListItem(item, vehicle.mileage)),
          ...deadlines
            .filter(item => item.vehicleId === vehicle.id && item.active)
            .map(item => buildDeadlineListItem(item))
        ])

        counts[vehicle.id] = countActionNeeded(activeItems)
      }

      setItems(vehicles.filter(item => item.active))
      setActionCounts(counts)
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری خودروها' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isConfigured()) return

    void loadItems()
  }, [loadItems, dataRevision])

  const openCreateForm = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const openEditForm = (item: VehicleProfileWithRow) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingItem(null)
  }

  const handleSubmit = async (values: VehicleProfileFormState) => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    const title = values.title.trim()

    if (!title) {
      showError('عنوان خودرو الزامی است')

      return
    }

    const mileage = parseNumeric(values.mileage)
    const mileageError = validateMileageIncrease(
      mileage,
      editingItem?.mileage ?? 0,
      editingItem ? editingItem.mileage : 0
    )

    if (mileageError) {
      showError(mileageError)

      return
    }

    setSaving(true)
    try {
      const payload = {
        title,
        mileage,
        vin: values.vin.trim(),
        buildYear: values.buildYear.trim(),
        capacity: values.capacity.trim(),
        plate: values.plate.trim(),
        mileageReminderInterval: values.mileageReminderInterval
      }

      if (editingItem) {
        await updateVehicle(spreadsheetId, editingItem.rowNumber, payload)
        showSuccess('خودرو به‌روزرسانی شد')
      } else {
        await createVehicle(spreadsheetId, payload)
        showSuccess('خودرو ثبت شد')
      }

      setShowForm(false)
      setEditingItem(null)
      await loadItems()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteConfirm = (item: VehicleProfileWithRow) => {
    setDeletingItem(item)
  }

  const closeDeleteConfirm = () => {
    if (deleting) return
    setDeletingItem(null)
  }

  const handleDelete = async () => {
    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId || !deletingItem) return

    setDeleting(true)
    try {
      await deleteVehicle(spreadsheetId, deletingItem.rowNumber)
      setDeletingItem(null)
      showSuccess('خودرو حذف شد')
      await loadItems()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
    } finally {
      setDeleting(false)
    }
  }

  const actionCountById = useMemo(() => actionCounts, [actionCounts])

  return {
    items,
    actionCountById,
    loading,
    showForm,
    editingItem,
    saving,
    deletingItem,
    deleting,
    loadItems,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete
  }
}
