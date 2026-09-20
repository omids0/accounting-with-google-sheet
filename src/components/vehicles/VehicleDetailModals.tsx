import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import type {
  VehicleProfileWithRow,
  VehicleCompleteFormState,
  VehicleDeadlineFormState,
  VehicleDeleteTarget,
  VehicleMechanicFormState,
  VehicleMileageFormState,
  VehiclePeriodicFormState
} from './types'
import VehicleCompleteModal from './VehicleCompleteModal'
import VehicleDeadlineFormModal from './VehicleDeadlineFormModal'
import {
  buildCompleteInitialValues,
  buildDeadlineInitialValues,
  buildPeriodicInitialValues
} from './vehicleDetailFormInitialValues'
import type { DeadlineWithRow, PeriodicWithRow } from './vehicleDetailMutations'
import VehicleItemDeleteModal from './VehicleItemDeleteModal'
import VehicleMechanicFormModal from './VehicleMechanicFormModal'
import VehicleMileageModal from './VehicleMileageModal'
import VehiclePeriodicFormModal from './VehiclePeriodicFormModal'
import type { VehicleTransactionItem } from '../../types/vehicles'

type VehicleDetailModalsProps = {
  vehicle: VehicleProfileWithRow
  serviceTypes: string[]
  onServiceTypesChange: (types: string[]) => void
  deadlineCategories: string[]
  onDeadlineCategoriesChange: (categories: string[]) => void
  mechanicCategories: string[]
  onMechanicCategoriesChange: (categories: string[]) => void
  showPeriodicForm: boolean
  editingPeriodic: PeriodicWithRow | null
  showDeadlineForm: boolean
  editingDeadline: DeadlineWithRow | null
  renewingDeadline: boolean
  showCompleteModal: boolean
  completingPeriodic: PeriodicWithRow | null
  showMechanicForm: boolean
  showMileageModal: boolean
  saving: boolean
  deleting: boolean
  deletingTarget: VehicleDeleteTarget | null
  deleteLinkedExpense: boolean
  onDeleteLinkedExpenseChange: (value: boolean) => void
  deletingTransaction: VehicleTransactionItem | null
  exportConfirmModal: {
    open: boolean
    title: string
    message: string
    confirming: boolean
    onClose: () => void
    onConfirm: () => void
  }
  onClosePeriodicForm: () => void
  onPeriodicSubmit: (values: VehiclePeriodicFormState) => void | Promise<void>
  onCloseDeadlineForm: () => void
  onDeadlineSubmit: (values: VehicleDeadlineFormState) => void | Promise<void>
  onCloseCompleteModal: () => void
  onCompleteSubmit: (values: VehicleCompleteFormState) => void | Promise<void>
  onCloseMechanicForm: () => void
  onMechanicSubmit: (values: VehicleMechanicFormState) => void | Promise<void>
  onCloseMileageModal: () => void
  onMileageSubmit: (values: VehicleMileageFormState) => void | Promise<void>
  onCloseDeleteTarget: () => void
  onDelete: () => void
  onCloseDeletingTransaction: () => void
  onDeleteTransaction: () => void | Promise<void>
}

export default function VehicleDetailModals({
  vehicle,
  serviceTypes,
  onServiceTypesChange,
  deadlineCategories,
  onDeadlineCategoriesChange,
  mechanicCategories,
  onMechanicCategoriesChange,
  showPeriodicForm,
  editingPeriodic,
  showDeadlineForm,
  editingDeadline,
  renewingDeadline,
  showCompleteModal,
  completingPeriodic,
  showMechanicForm,
  showMileageModal,
  saving,
  deleting,
  deletingTarget,
  deleteLinkedExpense,
  onDeleteLinkedExpenseChange,
  deletingTransaction,
  exportConfirmModal,
  onClosePeriodicForm,
  onPeriodicSubmit,
  onCloseDeadlineForm,
  onDeadlineSubmit,
  onCloseCompleteModal,
  onCompleteSubmit,
  onCloseMechanicForm,
  onMechanicSubmit,
  onCloseMileageModal,
  onMileageSubmit,
  onCloseDeleteTarget,
  onDelete,
  onCloseDeletingTransaction,
  onDeleteTransaction
}: VehicleDetailModalsProps) {
  const periodicInitialValues = buildPeriodicInitialValues(editingPeriodic, vehicle.mileage)
  const deadlineInitialValues = buildDeadlineInitialValues(editingDeadline)
  const completeInitialValues = buildCompleteInitialValues(completingPeriodic, vehicle)

  return (
    <>
      <VehiclePeriodicFormModal
        open={showPeriodicForm}
        title={editingPeriodic ? 'ویرایش سرویس دوره‌ای' : 'سرویس دوره‌ای جدید'}
        defaultMileage={vehicle.mileage}
        serviceTypes={serviceTypes}
        onServiceTypesChange={onServiceTypesChange}
        initialValues={periodicInitialValues}
        saving={saving}
        onClose={onClosePeriodicForm}
        onSubmit={onPeriodicSubmit}
      />

      <VehicleDeadlineFormModal
        open={showDeadlineForm}
        title={renewingDeadline ? 'تمدید موعد' : editingDeadline ? 'ویرایش موعد' : 'موعد جدید'}
        categories={deadlineCategories}
        onCategoriesChange={onDeadlineCategoriesChange}
        initialValues={deadlineInitialValues}
        saving={saving}
        onClose={onCloseDeadlineForm}
        onSubmit={onDeadlineSubmit}
      />

      <VehicleCompleteModal
        open={showCompleteModal}
        serviceType={completingPeriodic?.serviceType ?? ''}
        defaultMileage={vehicle.mileage}
        initialValues={completeInitialValues}
        saving={saving}
        onClose={onCloseCompleteModal}
        onSubmit={onCompleteSubmit}
      />

      <VehicleMechanicFormModal
        open={showMechanicForm}
        defaultMileage={vehicle.mileage}
        mechanicCategories={mechanicCategories}
        onMechanicCategoriesChange={onMechanicCategoriesChange}
        saving={saving}
        onClose={onCloseMechanicForm}
        onSubmit={onMechanicSubmit}
      />

      <VehicleMileageModal
        open={showMileageModal}
        vehicleTitle={vehicle.title}
        currentMileage={vehicle.mileage}
        saving={saving}
        onClose={onCloseMileageModal}
        onSubmit={onMileageSubmit}
      />

      <VehicleItemDeleteModal
        open={deletingTarget !== null}
        target={deletingTarget}
        deleteLinkedExpense={deleteLinkedExpense}
        onDeleteLinkedExpenseChange={onDeleteLinkedExpenseChange}
        deleting={deleting}
        onClose={onCloseDeleteTarget}
        onConfirm={onDelete}
      />

      <ConfirmActionModal {...exportConfirmModal} />

      <ConfirmDeleteModal
        open={deletingTransaction !== null}
        title="حذف تراکنش"
        message="این تراکنش از لیست هزینه‌ها هم حذف می‌شود. مطمئن هستید؟"
        deleting={deleting}
        onClose={onCloseDeletingTransaction}
        onConfirm={() => void onDeleteTransaction()}
      />
    </>
  )
}
