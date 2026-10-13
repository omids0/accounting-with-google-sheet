import { Capacitor } from '@capacitor/core'

import { hapticsEnabled } from './displayPrefs'

/**
 * - `light`: the raised dashboard button, a successful save
 * - `medium`: a delete starts (undo window opens)
 * - `selection`: switches and checkboxes (e.g. the paid tick)
 * - `error`: a failed save
 * - `success`: undo
 */
export type HapticKind = 'light' | 'medium' | 'selection' | 'error' | 'success'

/** Loads the plugin chunk on first use, only in the APK (an object so tests can stub it). */
export const hapticsPlugin = { load: () => import('@capacitor/haptics') }

async function play(kind: HapticKind) {
  const { Haptics, ImpactStyle, NotificationType } = await hapticsPlugin.load()

  switch (kind) {
    case 'light':
      return Haptics.impact({ style: ImpactStyle.Light })
    case 'medium':
      return Haptics.impact({ style: ImpactStyle.Medium })
    case 'error':
      return Haptics.notification({ type: NotificationType.Error })
    case 'success':
      return Haptics.notification({ type: NotificationType.Success })
    case 'selection':
      // Android only ticks on selectionChanged between start and end.
      await Haptics.selectionStart()
      await Haptics.selectionChanged()

      return Haptics.selectionEnd()
  }
}

/**
 * Fire-and-forget device feedback in the APK; a no-op on the web (plugin never
 * loaded) and when «صدای ثبت و لرزش» is off in Settings › نمایش.
 */
export function haptic(kind: HapticKind): void {
  if (!Capacitor.isNativePlatform() || !hapticsEnabled()) return
  play(kind).catch(() => undefined)
}

function onSelectionChange(event: Event) {
  const target = event.target

  if (target instanceof HTMLInputElement && target.type === 'checkbox') haptic('selection')
}

function onSwitchClick(event: Event) {
  const target = event.target instanceof Element ? event.target : null
  const control = target?.closest('[role="switch"]')

  if (control && !control.matches(':disabled')) haptic('selection')
}

/**
 * One document listener covers every checkbox (paid ticks, form options) and
 * `role="switch"` toggle. Installs nothing on the web. Returns the cleanup.
 */
export function installSelectionHaptics(): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined

  document.addEventListener('change', onSelectionChange, true)
  document.addEventListener('click', onSwitchClick, true)

  return () => {
    document.removeEventListener('change', onSelectionChange, true)
    document.removeEventListener('click', onSwitchClick, true)
  }
}
