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

describe('home-screen widget in a building or shared workspace', () => {
  beforeEach(() => {
    localStorage.clear()
    bridge.setSnapshot.mockClear()
    saveSettings({
      ...getDefaultSettings(),
      spreadsheetId: 'personal-1',
      spreadsheets: [
        { id: 'personal-1', name: 'p', createdAt: '' },
        { id: 'building-1', name: 'b', createdAt: '', kind: 'building' },
        { id: 'shared-1', name: 's', createdAt: '', kind: 'shared' }
      ]
    })
    setWorkspaceType('building-1', 'building')
    setWorkspaceType('shared-1', 'shared')
  })

  it('sends the personal spreadsheet', async () => {
    await sendWidgetSnapshot()

    expect(bridge.setSnapshot).toHaveBeenCalledWith({ json: '{"ok":1}' })
  })

  it('never sends a building, so the widget keeps the personal books', async () => {
    await sendWidgetSnapshot('building-1')

    expect(bridge.setSnapshot).not.toHaveBeenCalled()
  })

  it('never sends a shared account either, so its data never replaces the personal books', async () => {
    await sendWidgetSnapshot('shared-1')

    expect(bridge.setSnapshot).not.toHaveBeenCalled()
  })
})
