import { Capacitor } from '@capacitor/core'
import { useState } from 'react'

import DisplaySwitchRow from './DisplaySwitchRow'
import DisplayTextSize from './DisplayTextSize'
import { useAppThemeMode } from '../../../hooks/useAppThemeMode'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { useDisplayPrefsStore } from '../../../stores/displayPrefsStore'
import type { ThemeMode } from '../../../types'
import { getTheme, updateTheme } from '../../../utils/theme'
import { SegmentedRadio, type SegmentedRadioOption } from '../../form'
import Card from '../../ui/Card'
import {
  displaySettingsRowStackClass,
  displaySettingsRowTitleClass
} from '../../ui/displaySettingsStyles'
import { formHintClass } from '../../ui/formStyles'

const THEME_OPTIONS: SegmentedRadioOption<ThemeMode>[] = [
  { value: 'light', label: 'روشن' },
  { value: 'dark', label: 'تاریک' },
  { value: 'system', label: 'مثل سیستم' }
]

/** Formatters and module-level caches read the digit flag once per launch. */
function reloadApp() {
  window.location.reload()
}

/** Settings › «نمایش»: per-device text size, theme, motion, contrast, digits, haptics. */
export default function SettingsDisplayCard() {
  const prefs = useDisplayPrefsStore()
  const systemReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // Re-render when the drawer's quick toggle flips the theme; the stored mode is read fresh.
  useAppThemeMode()
  const [, rerender] = useState(0)
  const theme = getTheme()

  const changeTheme = (next: ThemeMode) => {
    updateTheme(next)
    rerender(count => count + 1)
  }

  return (
    <Card>
      <DisplayTextSize />

      <div className={displaySettingsRowStackClass}>
        <span className={displaySettingsRowTitleClass} aria-hidden="true">
          تم
        </span>
        <SegmentedRadio label="تم" options={THEME_OPTIONS} value={theme} onChange={changeTheme} />
      </div>

      <DisplaySwitchRow
        title="کاهش انیمیشن"
        hint={
          systemReducedMotion
            ? 'در تنظیم سیستم روشن است'
            : 'جابه‌جایی‌ها و محو شدن‌ها حذف می‌شوند؛ پیش‌فرض مثل تنظیم سیستم'
        }
        checked={prefs.reducedMotion || systemReducedMotion}
        disabled={systemReducedMotion}
        onChange={prefs.setReducedMotion}
      />
      <DisplaySwitchRow
        title="کنتراست بالا"
        hint="متن پررنگ‌تر، خط دور کارت‌ها"
        checked={prefs.highContrast}
        onChange={prefs.setHighContrast}
      />
      <DisplaySwitchRow
        title="ارقام فارسی"
        hint="۱۲۳ به‌جای 123؛ با تغییر، اپ دوباره باز می‌شود"
        checked={prefs.persianDigits}
        onChange={on => {
          prefs.setPersianDigits(on)
          reloadApp()
        }}
      />
      <DisplaySwitchRow
        title="صدای ثبت و لرزش"
        hint={
          Capacitor.isNativePlatform()
            ? 'لرزش کوتاه هنگام ثبت، حذف، بازگردانی و سوییچ‌ها'
            : 'فقط در اپ اندروید؛ مرورگر لرزش ندارد'
        }
        checked={prefs.haptics}
        onChange={prefs.setHaptics}
      />
      {Capacitor.getPlatform() === 'android' ? (
        <p className={formHintClass}>ویجت را از منوی لانچر اضافه کن.</p>
      ) : null}
    </Card>
  )
}
