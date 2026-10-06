import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('./sheetsApi', () => ({
  apiRequest,
  SHEETS_API: 'https://sheets.test/v4/spreadsheets'
}))

type Meta = { metadataId: number; metadataKey: string; metadataValue: string }

function layout(tabs: { title: string; sheetId: number; meta?: Meta[] }[]) {
  return {
    sheets: tabs.map(tab => ({
      properties: { title: tab.title, sheetId: tab.sheetId },
      developerMetadata: tab.meta ?? []
    }))
  }
}

function rev(id: number, value: string): Meta {
  return { metadataId: id, metadataKey: 'accounting_rev', metadataValue: value }
}

const ID = 'sheet-1'

async function load() {
  vi.resetModules()

  return import('./sheetRevisions')
}

describe('sheet change tokens', () => {
  beforeEach(() => apiRequest.mockReset())

  it('knows nothing before the first full download of the session', async () => {
    const { fetchSheetRevisions, findChangedSheets } = await load()

    apiRequest.mockResolvedValueOnce(layout([{ title: 'هزینه', sheetId: 1 }]))
    const revisions = await fetchSheetRevisions(ID)

    expect(findChangedSheets(ID, ['هزینه'], revisions)).toBeNull()
  })

  it('reports only the tabs whose token moved since they were downloaded', async () => {
    const { fetchSheetRevisions, findChangedSheets, markSheetsSeen } = await load()

    apiRequest.mockResolvedValueOnce(
      layout([
        { title: 'هزینه', sheetId: 1, meta: [rev(10, 'a')] },
        { title: 'درآمد', sheetId: 2, meta: [rev(11, 'b')] }
      ])
    )
    markSheetsSeen(ID, ['هزینه', 'درآمد'], await fetchSheetRevisions(ID))

    apiRequest.mockResolvedValueOnce(
      layout([
        { title: 'هزینه', sheetId: 1, meta: [rev(10, 'a2')] },
        { title: 'درآمد', sheetId: 2, meta: [rev(11, 'b')] }
      ])
    )
    const next = await fetchSheetRevisions(ID)

    expect(findChangedSheets(ID, ['هزینه', 'درآمد'], next)).toEqual(['هزینه'])
  })

  it('ignores metadata written by anything else', async () => {
    const { fetchSheetRevisions, findChangedSheets, markSheetsSeen } = await load()

    apiRequest.mockResolvedValueOnce(layout([{ title: 'هزینه', sheetId: 1 }]))
    markSheetsSeen(ID, ['هزینه'], await fetchSheetRevisions(ID))

    apiRequest.mockResolvedValueOnce(
      layout([
        {
          title: 'هزینه',
          sheetId: 1,
          meta: [{ metadataId: 5, metadataKey: 'other', metadataValue: 'x' }]
        }
      ])
    )

    expect(findChangedSheets(ID, ['هزینه'], await fetchSheetRevisions(ID))).toEqual([])
  })

  it('stamps written tabs, creating the token the first time and updating it after', async () => {
    const { fetchSheetRevisions, markSheetsSeen, stampSheetRevisions, findChangedSheets } =
      await load()

    apiRequest.mockResolvedValueOnce(layout([{ title: 'هزینه', sheetId: 7 }]))
    markSheetsSeen(ID, ['هزینه'], await fetchSheetRevisions(ID))

    apiRequest
      .mockResolvedValueOnce(layout([{ title: 'هزینه', sheetId: 7 }]))
      .mockResolvedValueOnce({
        replies: [{ createDeveloperMetadata: { developerMetadata: { metadataId: 99 } } }]
      })

    await stampSheetRevisions(ID, ['هزینه'])

    const body = JSON.parse(apiRequest.mock.calls[2][1].body)

    expect(body.requests[0].createDeveloperMetadata.developerMetadata).toMatchObject({
      metadataKey: 'accounting_rev',
      location: { sheetId: 7 }
    })

    const stamped = body.requests[0].createDeveloperMetadata.developerMetadata.metadataValue

    // Our own write is already in the local copy: no download needed for it.
    apiRequest.mockResolvedValueOnce(
      layout([{ title: 'هزینه', sheetId: 7, meta: [rev(99, stamped)] }])
    )
    expect(findChangedSheets(ID, ['هزینه'], await fetchSheetRevisions(ID))).toEqual([])
  })

  it('keeps a tab marked stale when another device changed it before our write', async () => {
    const { fetchSheetRevisions, markSheetsSeen, stampSheetRevisions, findChangedSheets } =
      await load()

    apiRequest.mockResolvedValueOnce(
      layout([{ title: 'هزینه', sheetId: 7, meta: [rev(3, 'mine')] }])
    )
    markSheetsSeen(ID, ['هزینه'], await fetchSheetRevisions(ID))

    // Another device stamped "theirs" in the meantime.
    apiRequest
      .mockResolvedValueOnce(layout([{ title: 'هزینه', sheetId: 7, meta: [rev(3, 'theirs')] }]))
      .mockResolvedValueOnce({ replies: [{}] })

    await stampSheetRevisions(ID, ['هزینه'])

    const body = JSON.parse(apiRequest.mock.calls[2][1].body)
    const ourToken = body.requests[0].updateDeveloperMetadata.developerMetadata.metadataValue

    apiRequest.mockResolvedValueOnce(
      layout([{ title: 'هزینه', sheetId: 7, meta: [rev(3, ourToken)] }])
    )
    expect(findChangedSheets(ID, ['هزینه'], await fetchSheetRevisions(ID))).toEqual(['هزینه'])
  })
})
