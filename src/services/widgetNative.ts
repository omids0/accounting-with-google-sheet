import { Capacitor, registerPlugin } from '@capacitor/core'

import { isPersonalWorkspace } from './workspace'

/** Native `WidgetBridge` (widget/WidgetBridgePlugin.java): stores the JSON and redraws. */
interface WidgetBridgePlugin {
  setSnapshot(options: { json: string }): Promise<void>
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge')

/** Bursts of writes (a bulk import, a sync) send one snapshot. */
export const WIDGET_PUSH_DEBOUNCE_MS = 2000

let timer: ReturnType<typeof setTimeout> | null = null

/** Builds and sends the snapshot now; `{"empty":true}` when signed out or without a sheet. */
export async function sendWidgetSnapshot(spreadsheetId?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { getSettings } = await import('./settings')
    const { buildWidgetSnapshot } = await import('./widgetSnapshot')
    const id = spreadsheetId ?? getSettings()?.spreadsheetId ?? ''

    // The widget shows the personal books only; a building or shared account leaves the last
    // snapshot in place.
    if (id && !isPersonalWorkspace(id)) return

    const snapshot = id ? await buildWidgetSnapshot(id) : null

    await WidgetBridge.setSnapshot({ json: JSON.stringify(snapshot ?? { empty: true }) })
  } catch {
    // An older APK without the plugin, or no data yet: the widget keeps its last state.
  }
}

/** After a sync, a local write, a resume or the hidden-amounts switch; no-op on the web. */
export function pushWidgetSnapshot(spreadsheetId?: string): void {
  if (!Capacitor.isNativePlatform()) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void sendWidgetSnapshot(spreadsheetId)
  }, WIDGET_PUSH_DEBOUNCE_MS)
}
