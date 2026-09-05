import type { Page } from '@playwright/test'

const MOCK_SPREADSHEET_ID = 'mock-spreadsheet-perf-test'

const MOCK_SESSION = {
  email: 'perf@test.local',
  name: 'Perf Test',
  accessToken: 'mock-access-token',
  tokenExpiry: Date.now() + 60 * 60 * 1000
}

const MOCK_SETTINGS = {
  spreadsheetId: MOCK_SPREADSHEET_ID,
  spreadsheets: [
    {
      id: MOCK_SPREADSHEET_ID,
      name: 'حسابداری تست',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ],
  forms: [
    {
      id: 'form_income',
      name: 'درآمد',
      sheetName: 'درآمد',
      type: 'income',
      fields: [
        { id: 'date', label: 'تاریخ', type: 'date', required: true },
        { id: 'title', label: 'عنوان', type: 'text', required: true },
        {
          id: 'category',
          label: 'دسته‌بندی',
          type: 'select',
          required: true,
          options: ['حقوق', 'فروش']
        },
        { id: 'amount', label: 'مبلغ', type: 'number', required: true },
        { id: 'note', label: 'توضیحات', type: 'text', required: false }
      ]
    },
    {
      id: 'form_expense',
      name: 'هزینه',
      sheetName: 'هزینه',
      type: 'expense',
      fields: [
        { id: 'date', label: 'تاریخ', type: 'date', required: true },
        { id: 'title', label: 'عنوان', type: 'text', required: true },
        {
          id: 'category',
          label: 'دسته‌بندی',
          type: 'select',
          required: true,
          options: ['خوراک', 'اجاره']
        },
        { id: 'amount', label: 'مبلغ', type: 'number', required: true },
        { id: 'note', label: 'توضیحات', type: 'text', required: false }
      ]
    }
  ],
  currency: 'toman',
  theme: 'light'
}

const EMPTY_SHEETS: Record<string, string[][]> = {
  'درآمد': [['شناسه', 'زمان ثبت', 'تاریخ', 'عنوان', 'دسته‌بندی', 'مبلغ', 'توضیحات']],
  'هزینه': [['شناسه', 'زمان ثبت', 'تاریخ', 'عنوان', 'دسته‌بندی', 'مبلغ', 'توضیحات']],
  'اقساط': [['شناسه', 'عنوان', 'مبلغ', 'تاریخ سررسید', 'وضعیت', 'یادداشت']],
  'بدهی': [['شناسه', 'عنوان', 'مبلغ', 'تاریخ', 'دسته', 'یادداشت']],
  'چک': [['شناسه', 'شماره', 'مبلغ', 'تاریخ سررسید', 'وضعیت', 'یادداشت']],
  'طلب': [['شناسه', 'عنوان', 'مبلغ', 'تاریخ', 'دسته', 'یادداشت']],
  'صندوق': [['شناسه', 'عنوان', 'مبلغ', 'نوع', 'تاریخ', 'یادداشت']],
  'کیف_پول': [['شناسه', 'عنوان', 'مبلغ', 'نوع', 'تاریخ', 'یادداشت']],
  'مانده_ماهانه': [['ماه', 'مانده']],
  'دسته‌بندی‌ها': [['نوع', 'نام']],
  'فعالیت': [['زمان', 'عملیات', 'جزئیات']],
  'قفل': [['فعال', 'هش', 'نمک', 'بروزرسانی']],
  'یادآوری‌ها': [['شناسه', 'عنوان', 'زمان', 'فعال']],
  'اشتراک_پوش': [['شناسه', 'endpoint']],
  'لاگ_یادآوری': [['زمان', 'شناسه', 'وضعیت']]
}

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
    },
    {
      session: MOCK_SESSION,
      settings: MOCK_SETTINGS,
      spreadsheetId: MOCK_SPREADSHEET_ID,
      sheets: EMPTY_SHEETS
    }
  )
}
