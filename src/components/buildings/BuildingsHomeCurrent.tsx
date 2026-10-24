import { useReturnToPersonal } from './useReturnToPersonal'
import { useActiveSpreadsheetName } from '../../hooks/useActiveSpreadsheetName'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { buildingCardClass, journeyNoteClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

/**
 * Top of the «مدیر ساختمان» home when it is opened from inside a building: which building is open
 * and the way back to the personal books (the cards below switch to another building).
 */
export default function BuildingsHomeCurrent() {
  const name = useActiveSpreadsheetName()
  const { returnToPersonal, modalProps } = useReturnToPersonal()

  return (
    <Card className={buildingCardClass}>
      <p className={journeyNoteClass}>
        {name ? `شما الان در «${name}» هستید.` : 'شما الان در یک ساختمان هستید.'} برای رفتن به
        ساختمان دیگر، «ورود» آن را بزن.
      </p>
      <Button type="button" variant="secondary" onClick={returnToPersonal}>
        برگشت به حساب شخصی
      </Button>
      <SheetSwitchConfirmModal {...modalProps} />
    </Card>
  )
}
