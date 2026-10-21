import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getDefaultSettings, saveSettings } from './settings'
import { sendWidgetSnapshot } from './widgetNative'
import { setWorkspaceType } from './workspace'

const bridge = vi.hoisted(() => ({ setSnapshot: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => bridge
}))

vi.mock('./widgetSnapshot', () => ({ buildWidgetSnapshot: vi.fn().mockResolvedValue({ ok: 1 }) }))

describe('home-screen widget in a building workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    bridge.setSnapshot.mockClear()
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [
        { id: 'personal-1', name: 'p', createdAt: '' },
        { id: 'building-1', name: 'b', createdAt: '', kind: 'building' }
      ]
    })
    setWorkspaceType('building-1', 'building')
  })

  it('sends the personal spreadsheet', async () => {
    await sendWidgetSnapshot()

    expect(bridge.setSnapshot).toHaveBeenCalledWith({ json: '{"ok":1}' })
  })

  it('never sends a building, so the widget keeps the personal books', async () => {
    await sendWidgetSnapshot('building-1')

    expect(bridge.setSnapshot).not.toHaveBeenCalled()
  })
})
