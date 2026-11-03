import { describe, expect, it } from 'vitest'

import { SPEED_DIAL_TABS } from './types'
import { getPathForTab, getTabFromPath } from '../../routes/paths'

describe('SPEED_DIAL_TABS', () => {
  it('lets the transfers page show its «ثبت انتقال» speed dial', () => {
    const tab = getTabFromPath(getPathForTab('wallet-transfers'))

    expect(tab).toBe('wallet-transfers')
    expect(SPEED_DIAL_TABS).toContain('wallet-transfers')
  })
})
