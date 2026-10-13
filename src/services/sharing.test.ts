import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getSharingInfo,
  isSharedSpreadsheet,
  refreshSharingInfo,
  refreshSharingInfoIfStale,
  SHARING_KEY,
  sharingFromPermissions,
  writerLabel
} from './sharing'

const driveRequest = vi.fn()

vi.mock('./drive', () => ({
  DRIVE_API: 'https://drive.test/files',
  driveRequest: (url: string) => driveRequest(url)
}))
vi.mock('./auth', () => ({ getUserEmail: () => 'me@example.com' }))

const SHEET = 'sheet-sharing'

const OWNER = { emailAddress: 'me@example.com', role: 'owner', displayName: 'Omid' }

describe('sharingFromPermissions', () => {
  it('treats one owner as private', () => {
    expect(sharingFromPermissions([OWNER]).shared).toBe(false)
  })

  it('treats an owner plus a writer as shared', () => {
    const info = sharingFromPermissions([
      OWNER,
      { emailAddress: 'Sara@Example.com', role: 'writer', displayName: 'Sara' }
    ])

    expect(info.shared).toBe(true)
    expect(info.editors).toEqual([
      { email: 'me@example.com', name: 'Omid' },
      { email: 'sara@example.com', name: 'Sara' }
    ])
  })

  it('ignores readers and commenters', () => {
    const info = sharingFromPermissions([
      OWNER,
      { emailAddress: 'r@example.com', role: 'reader' },
      { emailAddress: 'c@example.com', role: 'commenter' }
    ])

    expect(info.shared).toBe(false)
    expect(info.editors).toHaveLength(1)
  })
})

describe('refreshSharingInfo', () => {
  beforeEach(() => {
    localStorage.removeItem(SHARING_KEY)
    driveRequest.mockReset()
  })

  it('stores the answer per spreadsheet', async () => {
    driveRequest.mockResolvedValue({
      permissions: [OWNER, { emailAddress: 'sara@example.com', role: 'writer' }]
    })

    const info = await refreshSharingInfo(SHEET)

    expect(info.shared).toBe(true)
    expect(isSharedSpreadsheet(SHEET)).toBe(true)
    expect(isSharedSpreadsheet('other')).toBe(false)
    expect(driveRequest.mock.calls[0][0]).toContain(`/files/${SHEET}?fields=`)
  })

  it('keeps the cached value when Drive fails', async () => {
    driveRequest.mockResolvedValueOnce({
      permissions: [OWNER, { emailAddress: 'sara@example.com', role: 'writer' }]
    })
    await refreshSharingInfo(SHEET)
    driveRequest.mockRejectedValueOnce(new Error('403'))

    expect((await refreshSharingInfo(SHEET)).shared).toBe(true)
  })

  it('answers private when Drive fails and nothing is cached', async () => {
    driveRequest.mockRejectedValue(new Error('offline'))

    expect(await refreshSharingInfo(SHEET)).toEqual({ shared: false, editors: [], checkedAt: 0 })
    expect(getSharingInfo(SHEET)).toBeNull()
  })

  it('asks Drive at most once a day', async () => {
    driveRequest.mockResolvedValue({ permissions: [OWNER] })
    await refreshSharingInfo(SHEET)
    driveRequest.mockClear()

    const checkedAt = getSharingInfo(SHEET)?.checkedAt ?? 0

    refreshSharingInfoIfStale(SHEET, checkedAt + 60_000)
    expect(driveRequest).not.toHaveBeenCalled()
    refreshSharingInfoIfStale(SHEET, checkedAt + 25 * 60 * 60_000)
    expect(driveRequest).toHaveBeenCalledTimes(1)
  })
})

describe('writerLabel', () => {
  const info = sharingFromPermissions([
    OWNER,
    { emailAddress: 'sara@example.com', role: 'writer', displayName: 'سارا' }
  ])

  it('uses the Drive display name when known', () => {
    expect(writerLabel('sara@example.com', info)).toEqual({
      initial: 'س',
      name: 'سارا',
      isMe: false
    })
  })

  it('falls back to the part before @', () => {
    expect(writerLabel('ali.r@example.com', info)).toEqual({
      initial: 'A',
      name: 'ali.r',
      isMe: false
    })
  })

  it('knows the signed-in account', () => {
    expect(writerLabel('ME@example.com', null).isMe).toBe(true)
  })
})
