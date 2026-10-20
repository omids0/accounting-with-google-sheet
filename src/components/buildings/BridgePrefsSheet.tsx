import BridgeTick from './BridgeTick'
import PickerSheet from '../form/PickerSheet'
import { journeyNoteClass } from '../ui/buildingStyles'

/**
 * «پل با حساب شخصی» (Step 8's two ticks, kept per device). Here they are only set once; each
 * payment or expense form still shows its own tick, so a single entry can opt out.
 */
export default function BridgePrefsSheet({
  open,
  buildingName,
  onClose
}: {
  open: boolean
  buildingName: string
  onClose: () => void
}) {
  return (
    <PickerSheet open={open} title="پل با حساب شخصی" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className={journeyNoteClass}>
          فقط این دو کار بین ساختمان و حساب شخصی‌ات می‌گذرد و هر کدام را در فرم خودش هم می‌توانی
          خاموش کنی. چیز دیگری از ساختمان به حساب شخصی نمی‌رود.
        </p>
        <BridgeTick
          pref="pocket"
          text={`طلب از «${buildingName}» برای هزینه‌ای که از جیب می‌دهی`}
        />
        <BridgeTick pref="ownUnit" text="هزینهٔ «خانه › شارژ» برای شارژ واحد خودت" />
      </div>
    </PickerSheet>
  )
}
