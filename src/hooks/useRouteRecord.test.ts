import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import { useRouteRecord } from './useRouteRecord'
import { bumpDataRevision } from '../services/dataRevision'

vi.mock('../services/settings', () => ({ getSettings: () => ({ spreadsheetId: 's1' }) }))
vi.mock('../utils/sheetError', () => ({ handleSheetError: vi.fn() }))

type Result = ReturnType<typeof useRouteRecord<{ id: string }>>

async function mount(
  fetchAll: () => Promise<{ id: string }[]>,
  enabled = true,
  refreshOnDataChange = false
) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const holder: { result?: Result } = {}
  const Probe = () => {
    holder.result = useRouteRecord('a', fetchAll, enabled, refreshOnDataChange)

    return null
  }

  await act(async () => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { result: Result }
}

describe('useRouteRecord', () => {
  it('finds the record', async () => {
    const { result } = await mount(async () => [{ id: 'a' }])

    expect(result.record).toEqual({ id: 'a' })
    expect(result.error).toBe(false)
  })

  it('says error, not missing, when the read fails, and retries', async () => {
    const fetchAll = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([{ id: 'a' }])
    const holder = await mount(fetchAll)

    expect(holder.result.record).toBeNull()
    expect(holder.result.error).toBe(true)

    await act(async () => holder.result.retry())
    expect(holder.result.record).toEqual({ id: 'a' })
    expect(holder.result.error).toBe(false)
  })

  it('keeps an unknown id as missing without an error', async () => {
    const { result } = await mount(async () => [{ id: 'b' }])

    expect(result.record).toBeNull()
    expect(result.error).toBe(false)
  })

  it('reads again when the data changes, only if asked to', async () => {
    const fetchAll = vi.fn(async () => [{ id: 'a' }])
    const plain = await mount(fetchAll)
    const watching = await mount(fetchAll, true, true)

    expect(plain.result.record).toEqual({ id: 'a' })
    fetchAll.mockClear()
    await act(async () => bumpDataRevision())

    // Only the watching mount (the plain one stays at one read).
    expect(fetchAll).toHaveBeenCalledTimes(1)
    expect(watching.result.loading).toBe(false)
  })

  it('does not read when disabled', async () => {
    const fetchAll = vi.fn(async () => [{ id: 'a' }])
    const { result } = await mount(fetchAll, false)

    expect(fetchAll).not.toHaveBeenCalled()
    expect(result.loading).toBe(false)
  })
})
