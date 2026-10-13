import { useDisplayPrefsStore } from '../../../stores/displayPrefsStore'
import { TEXT_SIZE_OPTIONS } from '../../../utils/displayPrefs'
import { formatSignedNumber } from '../../../utils/formatMoney'
import { toPersianDigits } from '../../../utils/normalizeDigits'
import { SegmentedRadio } from '../../form'
import {
  calmDayBadgeClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../../ui/calmListStyles'
import {
  displaySettingsPreviewCaptionClass,
  displaySettingsPreviewClass,
  displaySettingsRowStackClass,
  displaySettingsRowTitleClass
} from '../../ui/displaySettingsStyles'

/** «اندازهٔ متن»: four steps on the root font size, with a live sample row under it. */
export default function DisplayTextSize() {
  const textSize = useDisplayPrefsStore(state => state.textSize)
  const setTextSize = useDisplayPrefsStore(state => state.setTextSize)

  return (
    <div className={displaySettingsRowStackClass}>
      <span className={displaySettingsRowTitleClass} aria-hidden="true">
        اندازهٔ متن
      </span>
      <SegmentedRadio
        label="اندازهٔ متن"
        options={TEXT_SIZE_OPTIONS}
        value={textSize}
        onChange={setTextSize}
      />
      <div className={displaySettingsPreviewClass}>
        <div className={calmRowClass}>
          <span className={calmDayBadgeClass} aria-hidden="true">
            {toPersianDigits('12')}
          </span>
          <span className={calmRowMainClass}>
            <span className={calmRowTitleClass}>تعمیر یخچال</span>
            <span className={calmRowSubClass}>خانه · ملت</span>
          </span>
          <span className={calmRowEndClass}>{formatSignedNumber(-2_400_000)}</span>
        </div>
        <small className={displaySettingsPreviewCaptionClass}>پیش‌نمایش</small>
      </div>
    </div>
  )
}
