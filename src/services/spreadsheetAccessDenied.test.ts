import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./auth', () => ({ getAccessToken: () => 'token', isTokenValid: () => true }))

vi.mock('./tokenRefresh', () => ({ forceRefreshAccessToken: vi.fn(async () => false) }))

import { isSpreadsheetAccessDeniedError, SheetsApiError } from './sheetsApi'
import { verifySpreadsheetExists } from './sheetsEnsure'
import { invalidateSpreadsheetCache } from './sheetsMeta'

function reply(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { code: status, message } })
  } as Response
}

describe('isSpreadsheetAccessDeniedError', () => {
  it('matches the drive.file refusal for a sheet the app did not create', () => {
    expect(
      isSpreadsheetAccessDeniedError(new SheetsApiError('The caller does not have permission', 403))
    ).toBe(true)
    expect(isSpreadsheetAccessDeniedError(new Error('PERMISSION_DENIED'))).toBe(true)
  })

  it('matches a hidden or deleted sheet', () => {
    expect(
      isSpreadsheetAccessDeniedError(new SheetsApiError('Requested entity was not found.', 404))
    ).toBe(true)
    expect(isSpreadsheetAccessDeniedError(new SheetsApiError('خطای API: 404', 404))).toBe(true)
  })

  it('ignores other 403s and unrelated failures', () => {
    for (const message of [
      'Request had insufficient authentication scopes.',
      'Google Sheets API has not been used in project 1 before or it is disabled.',
      'Quota exceeded for quota metric'
    ]) {
      expect(isSpreadsheetAccessDeniedError(new SheetsApiError(message, 403))).toBe(false)
    }
    expect(isSpreadsheetAccessDeniedError(new SheetsApiError('Internal error', 500))).toBe(false)
    expect(isSpreadsheetAccessDeniedError(new TypeError('Failed to fetch'))).toBe(false)
  })
})

describe('verifySpreadsheetExists under drive.file', () => {
  beforeEach(() => {
    invalidateSpreadsheetCache('sheet-1')
    vi.unstubAllGlobals()
  })

  it('reports a sheet the app may not open as unusable instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply(403, 'The caller does not have permission'))
    )

    await expect(verifySpreadsheetExists('sheet-1')).resolves.toBe(false)
  })

  it('still reports a missing sheet as unusable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply(404, 'Requested entity was not found.'))
    )

    await expect(verifySpreadsheetExists('sheet-1')).resolves.toBe(false)
  })

  it('lets a missing-scope error through so the caller can ask for sign-in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply(403, 'Request had insufficient authentication scopes.'))
    )

    await expect(verifySpreadsheetExists('sheet-1')).rejects.toThrow(/insufficient/)
  })
})
