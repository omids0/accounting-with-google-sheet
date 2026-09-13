import type {
  VehicleCompleteFormState,
  VehicleDeadlineFormState,
  VehicleMechanicFormState,
  VehicleMileageFormState,
  VehiclePeriodicFormState,
  VehicleProfileWithRow,
  VehicleDeleteTarget
} from './types'
import { validateMileageIncrease } from './utils'
import {
  deleteVehicleDetailItem,
  submitCompleteForm,
  submitDeadlineForm,
  submitMechanicForm,
  submitMileageForm,
  submitPeriodicForm,
  validatePeriodicMileage,
  type DeadlineWithRow,
  type PeriodicWithRow
} from './vehicleDetailMutations'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { parseNumeric } from '../../utils/parseNumeric'
import { showError, showSuccess } from '../../utils/toast'

type HandlerContext = {
  currentVehicle: VehicleProfileWithRow
  editingPeriodic: PeriodicWithRow | null
  completingPeriodic: PeriodicWithRow | null
  editingDeadline: DeadlineWithRow | null
  renewingDeadline: boolean
  deletingTarget: VehicleDeleteTarget | null
  deleteLinkedExpense: boolean
  setSaving: (value: boolean) => void
  setDeleting: (value: boolean) => void
  setDeletingTarget: (value: VehicleDeleteTarget | null) => void
  loadDetail: () => Promise<void>
  onPeriodicSaved: () => void
  onDeadlineSaved: () => void
  onCompleteSaved: () => void
  onMechanicSaved: () => void
  onMileageSaved: () => void
}

async function runMutation(
  context: HandlerContext,
  action: () => Promise<void>,
  successMessage: string,
  onDone?: () => void
) {
  context.setSaving(true)
  try {
    await action()
    onDone?.()
    showSuccess(successMessage)
    await context.loadDetail()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'عملیات ناموفق بود')
  } finally {
    context.setSaving(false)
  }
}

export function createVehicleDetailHandlers(context: HandlerContext) {
  return {
    handlePeriodicSubmit: async (values: VehiclePeriodicFormState) => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const mileageError = validatePeriodicMileage(
        parseNumeric(values.mileage),
        context.currentVehicle,
        parseNumeric(values.intervalKm)
      )

      if (mileageError) {
        showError(mileageError)

        return
      }

      await runMutation(
        context,
        () =>
          submitPeriodicForm({
            spreadsheetId,
            vehicle: context.currentVehicle,
            values,
            editingPeriodic: context.editingPeriodic
          }),
        context.editingPeriodic ? 'سرویس به‌روزرسانی شد' : 'سرویس ثبت شد',
        context.onPeriodicSaved
      )
    },

    handleCompleteSubmit: async (values: VehicleCompleteFormState) => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId || !context.completingPeriodic) return

      const mileageError = validatePeriodicMileage(
        parseNumeric(values.mileage),
        context.currentVehicle,
        parseNumeric(values.intervalKm)
      )

      if (mileageError) {
        showError(mileageError)

        return
      }

      await runMutation(
        context,
        () =>
          submitCompleteForm({
            spreadsheetId,
            vehicle: context.currentVehicle,
            completingPeriodic: context.completingPeriodic!,
            values
          }),
        'سرویس انجام شد',
        context.onCompleteSaved
      )
    },

    handleDeadlineSubmit: async (values: VehicleDeadlineFormState) => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const successMessage = context.renewingDeadline
        ? 'موعد تمدید شد'
        : context.editingDeadline
        ? 'موعد به‌روزرسانی شد'
        : 'موعد ثبت شد'

      await runMutation(
        context,
        () =>
          submitDeadlineForm({
            spreadsheetId,
            vehicle: context.currentVehicle,
            values,
            editingDeadline: context.editingDeadline,
            renewingDeadline: context.renewingDeadline
          }),
        successMessage,
        context.onDeadlineSaved
      )
    },

    handleMechanicSubmit: async (values: VehicleMechanicFormState) => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      if (!values.items.some(item => item.category.trim())) {
        showError('حداقل یک قلم کار وارد کنید')

        return
      }

      const mileage = parseNumeric(values.mileage)

      if (mileage > 0) {
        const mileageError = validateMileageIncrease(
          mileage,
          context.currentVehicle.mileage,
          context.currentVehicle.mileage
        )

        if (mileageError) {
          showError(mileageError)

          return
        }
      }

      await runMutation(
        context,
        () => submitMechanicForm({ spreadsheetId, vehicle: context.currentVehicle, values }),
        'مراجعه مکانیک ثبت شد',
        context.onMechanicSaved
      )
    },

    handleMileageSubmit: async (values: VehicleMileageFormState) => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId) return

      const mileageError = validateMileageIncrease(
        parseNumeric(values.mileage),
        context.currentVehicle.mileage,
        context.currentVehicle.mileage
      )

      if (mileageError) {
        showError(mileageError)

        return
      }

      await runMutation(
        context,
        () => submitMileageForm({ spreadsheetId, vehicle: context.currentVehicle, values }),
        'کارکرد به‌روزرسانی شد',
        context.onMileageSaved
      )
    },

    handleDelete: async () => {
      const spreadsheetId = requireSpreadsheetId()

      if (!spreadsheetId || !context.deletingTarget) return

      context.setDeleting(true)
      try {
        await deleteVehicleDetailItem({
          spreadsheetId,
          target: context.deletingTarget,
          deleteLinkedExpense: context.deleteLinkedExpense
        })
        context.setDeletingTarget(null)
        showSuccess('حذف شد')
        await context.loadDetail()
      } catch (err) {
        showError(err instanceof Error ? err.message : 'حذف ناموفق بود')
      } finally {
        context.setDeleting(false)
      }
    }
  }
}
