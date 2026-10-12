import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

interface MockSeed {
  spreadsheetId: string
  session: Record<string, string>
  settings: Record<string, unknown>
  sheets: Record<string, string[][]>
}

// Shared with scripts/run-lighthouse.mjs, which seeds the same signed-in state.
const MOCK_SEED = JSON.parse(
  readFileSync(new URL('./mockAppSeed.json', import.meta.url), 'utf8')
) as MockSeed

const MOCK_SPREADSHEET_ID = MOCK_SEED.spreadsheetId

const MOCK_SESSION = {
  ...MOCK_SEED.session,
  // The seeded scope includes drive.file; sessions without it are sent to sign-in.
  tokenExpiry: Date.now() + 60 * 60 * 1000
}

const MOCK_SETTINGS = MOCK_SEED.settings

const EMPTY_SHEETS = MOCK_SEED.sheets

export async function mockGoogleApis(page: Page): Promise<void> {
  await page.route('**/*', async route => {
    const url = route.request().url()

    if (!url.includes('googleapis.com') && !url.includes('google.com')) {
      await route.continue()
      return
    }

    if (url.includes('/spreadsheets/') && url.includes('/values/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ range: 'A1', majorDimension: 'ROWS', values: [] })
      })
      return
    }

    if (url.includes('/spreadsheets/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          spreadsheetId: MOCK_SPREADSHEET_ID,
          properties: { title: 'حسابداری تست' },
          sheets: Object.keys(EMPTY_SHEETS).map(title => ({
            properties: { title, sheetId: title.length }
          }))
        })
      })
      return
    }

    if (url.includes('/drive/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              id: MOCK_SPREADSHEET_ID,
              name: 'حسابداری تست',
              modifiedTime: '2026-01-01T00:00:00.000Z'
            }
          ]
        })
      })
      return
    }

    if (url.includes('/oauth2/') || url.includes('/token') || url.includes('/userinfo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
          email: 'perf@test.local',
          name: 'Perf Test'
        })
      })
      return
    }

    if (url.includes('tgju.org') || url.includes('tgju')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    })
  })
}

export async function seedMockAppState(page: Page): Promise<void> {
  await page.addInitScript(
    ({ session, settings, spreadsheetId, sheets }) => {
      localStorage.setItem('accounting_session', JSON.stringify(session))
      localStorage.setItem('accounting_settings', JSON.stringify(settings))
      localStorage.setItem(
        `accounting_sheet_store_${spreadsheetId}`,
        JSON.stringify({
          spreadsheetId,
          sheets,
          lastSyncedAt: Date.now()
        })
      )
      sessionStorage.setItem('accounting_sheets_ready', spreadsheetId)
      // An established user: the first-run setup wizard must not cover the pages under test.
      localStorage.setItem(
        'accounting_onboarding_v1',
        JSON.stringify({ [spreadsheetId]: { status: 'finished', steps: {} } })
      )
    },
    {
      session: MOCK_SESSION,
      settings: MOCK_SETTINGS,
      spreadsheetId: MOCK_SPREADSHEET_ID,
      sheets: EMPTY_SHEETS
    }
  )
}
