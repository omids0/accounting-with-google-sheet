import { beforeEach, describe, expect, it, vi } from 'vitest'

const io = vi.hoisted(() => ({ fetchError: null as unknown }))

vi.mock('./auth', () => ({ getUserEmail: () => 'mom@gmail.com' }))
vi.mock('./drive', () => ({
  getDriveFileAccess: vi.fn(async () => ({ ownedByMe: false }))
}))
vi.mock('./sheetsRows', () => ({
  batchFetchSheetRangesFromApi: vi.fn(async () => {
    if (io.fetchError) throw io.fetchError

    return new Map<string, string[][]>()
  })
}))

import {
  childConnectNoAccessMessage,
  childConnectNotOpenedMessage,
  connectChildAccount
} from './childConnect'

beforeEach(() => {
  io.fetchError = null
  localStorage.clear()
})

describe('child connect without access', () => {
  it('tells the parent the child must share with this account, not «sign in as the creator»', async () => {
    io.fetchError = Object.assign(new Error('The caller does not have permission'), { status: 403 })

    const error = await connectChildAccount('kid-sheet').catch((err: Error) => err)

    expect(error).toBeInstanceOf(Error)

    const message = (error as Error).message

    expect(message).toContain('فرزندتان باید ابتدا شیت را')
    expect(message).toContain('mom@gmail.com')
    expect(message).not.toContain('که شیت را ساخته')
  })

  it('explains a 404 (a shared sheet never opened through the Picker) instead of «sheet deleted»', async () => {
    io.fetchError = Object.assign(new Error('Requested entity was not found.'), { status: 404 })

    const error = await connectChildAccount('kid-sheet').catch((err: Error) => err)

    expect((error as Error).message).toBe(childConnectNotOpenedMessage())
    expect((error as Error).message).toContain('به اشتراک گذاشته‌شده با من')
    expect((error as Error).message).not.toContain('حذف')
  })

  it('names the web app when the Picker is missing, the button when it exists', () => {
    expect(childConnectNotOpenedMessage(false)).toContain('در نسخهٔ وب اپ')
    expect(childConnectNotOpenedMessage(true)).toContain('دکمهٔ «باز کردن شیت با گوگل»')
    expect(childConnectNotOpenedMessage(true)).not.toContain('نسخهٔ وب')
  })

  it('leaves other failures untouched', async () => {
    io.fetchError = new Error('Failed to fetch')

    await expect(connectChildAccount('kid-sheet')).rejects.toThrow('Failed to fetch')
  })

  it('still reads well without a known e-mail', () => {
    expect(childConnectNoAccessMessage(null)).not.toContain('()')
    expect(childConnectNoAccessMessage(null)).toContain('به اشتراک بگذارد')
  })
})
