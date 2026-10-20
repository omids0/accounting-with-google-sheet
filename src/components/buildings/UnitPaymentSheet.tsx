import type { BuildingSetupData } from './useBuildingSetupData'
import FormModal from '../FormModal'
import { journeyNoteClass } from '../ui/buildingStyles'

export interface UnitPaymentSheetProps {
  open: boolean
  /** The unit that paid; null while no unit is picked. */
  unitId: string | null
  /** What the building page already loaded (units, stays, people, receivables, accounts). */
  data: BuildingSetupData
  onClose: () => void
  /** Called after the payment is written, so the page can read its data again. */
  onSaved: () => void
}

/**
 * Round 11, Step 4 owns this sheet (screen 20: amount on the dial pad, date, fund account,
 * duplicate card, allocation line, credit, receipt). Until then it only holds the place the
 * dashboard's «ثبت واریزی شارژ» and the unit rows open, with the props Step 4 fills in.
 */
export default function UnitPaymentSheet({ open, unitId, onClose }: UnitPaymentSheetProps) {
  return (
    <FormModal
      open={open && !!unitId}
      title="ثبت پرداخت شارژ"
      onClose={onClose}
      onSubmit={event => event.preventDefault()}
      saveLabel="ثبت پرداخت"
      saveDisabled
      cancelLabel="بستن"
    >
      <p className={journeyNoteClass}>ثبت پرداخت شارژ، رسید و اعتبار واحد به‌زودی اضافه می‌شود.</p>
    </FormModal>
  )
}
