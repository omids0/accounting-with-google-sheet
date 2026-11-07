import { useAppThemeMode } from '../../../hooks/useAppThemeMode'
import { usePalettes } from '../../../hooks/usePalettes'
import { changePalette } from '../../../services/appPalette'
import { APP_PALETTES, type PaletteId } from '../../../utils/appPalettes'
import { SwatchRadioGroup } from '../../form'
import {
  displaySettingsRowHintClass,
  displaySettingsRowStackClass,
  displaySettingsRowTitleClass
} from '../../ui/displaySettingsStyles'

const LIGHT_OPTIONS = APP_PALETTES.map(palette => ({
  value: palette.id,
  label: palette.label,
  background: palette.lightSwatch
}))

const DARK_OPTIONS = APP_PALETTES.map(palette => ({
  value: palette.id,
  label: palette.label,
  background: palette.darkSwatch
}))

/** Marks the row of the mode on screen, so a pick in the other row does not look broken. */
function InUseTag() {
  return (
    <span className="rounded-full bg-(--color-accent-soft) px-2 py-0.5 text-[0.68rem] font-bold text-primary-dark">
      در حال استفاده
    </span>
  )
}

/** «رنگ تم»: one palette for the light mode and one for the dark mode, synced with the account. */
export default function DisplayPalette() {
  const palettes = usePalettes()
  const mode = useAppThemeMode()

  const pick = (target: 'light' | 'dark') => (id: PaletteId) => void changePalette(target, id)

  return (
    <>
      <div className={displaySettingsRowStackClass}>
        <span className={displaySettingsRowTitleClass}>رنگ تم</span>
        <span className={displaySettingsRowHintClass}>
          حالت روشن و تاریک جدا انتخاب می‌شوند؛ رنگ هر حالت وقتی همان حالت روشن شود دیده می‌شود. با
          حساب گوگل روی همهٔ دستگاه‌ها یکی است.
        </span>
        {palettes.pending ? (
          <span className={displaySettingsRowHintClass} role="status">
            در این حساب یا بدون اینترنت فقط روی همین دستگاه اعمال می‌شود و با حساب شخصی همگام
            می‌شود.
          </span>
        ) : null}
      </div>

      <div className={displaySettingsRowStackClass}>
        <span className="flex items-center gap-2">
          <span className={displaySettingsRowTitleClass} aria-hidden="true">
            حالت روشن
          </span>
          {mode === 'light' ? <InUseTag /> : null}
        </span>
        <SwatchRadioGroup
          label="رنگ تم در حالت روشن"
          options={LIGHT_OPTIONS}
          value={palettes.light}
          onChange={pick('light')}
        />
      </div>

      <div className={displaySettingsRowStackClass}>
        <span className="flex items-center gap-2">
          <span className={displaySettingsRowTitleClass} aria-hidden="true">
            حالت تاریک
          </span>
          {mode === 'dark' ? <InUseTag /> : null}
        </span>
        <SwatchRadioGroup
          label="رنگ تم در حالت تاریک"
          options={DARK_OPTIONS}
          value={palettes.dark}
          onChange={pick('dark')}
        />
      </div>
    </>
  )
}
