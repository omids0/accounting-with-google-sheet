import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTransferModal, UNFINISHED_TRANSFER_TOAST_MS } from './useTransferModal'
import { TransferWriteError } from '../../../services/transfersLegs'
import { handleSheetError } from '../../../utils/sheetError'
import { showSuccess } from '../../../utils/toast'

const state = vi.hoisted(() => ({
  workspace: 'personal',
  accounts: [] as { id: string }[]
}))
const create = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ id: 't1' })))

vi.mock('../../../hooks/useWorkspaceType', () => ({ useWorkspaceType: () => state.workspace }))
vi.mock('./useTransferAccounts', () => ({ useTransferAccounts: () => state.accounts }))
vi.mock('../../../services/settings', () => ({
  getSettings: () => ({ spreadsheetId: 'sheet-1' }),
  isConfigured: () => true
}))
vi.mock('../../../services/transfers', async () => ({
  createTransfer: create,
  TransferWriteError: (await import('../../../services/transfersLegs')).TransferWriteError
}))
vi.mock('../../../utils/authGuard', () => ({ requireAuth: () => true }))
vi.mock('../../../utils/sheetError', () => ({ handleSheetError: vi.fn(() => false) }))
vi.mock('../../../utils/toast', () => ({ showError: vi.fn(), showSuccess: vi.fn() }))

const draft = {
  fromAccountId: 'a',
  toAccountId: 'b',
  amount: 250 as number | '',
  date: '2026-10-27',
  note: ' کارت به کارت '
}

function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  const holder: { modal?: ReturnType<typeof useTransferModal> } = {}

  const Probe = () => {
    holder.modal = useTransferModal()

    return null
  }

  act(() => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { modal: ReturnType<typeof useTransferModal> }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.workspace = 'personal'
  state.accounts = [{ id: 'a' }, { id: 'b' }]
})

describe('useTransferModal entry points', () => {
  it('offers a transfer in the personal book with two accounts', () => {
    expect(mount().modal.canTransfer).toBe(true)
  })

  it('offers nothing in a building or a shared account', () => {
    state.workspace = 'building'
    expect(mount().modal.canTransfer).toBe(false)
    state.workspace = 'shared'
    expect(mount().modal.canTransfer).toBe(false)
  })

  it('offers nothing with fewer than two accounts', () => {
    state.accounts = [{ id: 'a' }]
    expect(mount().modal.canTransfer).toBe(false)
  })

  it('opens on the account it was opened from and closes again', () => {
    const holder = mount()

    expect(holder.modal.modalProps.open).toBe(false)
    act(() => holder.modal.openTransfer('a'))
    expect(holder.modal.modalProps).toMatchObject({ open: true, initialFromId: 'a' })
    act(() => holder.modal.modalProps.onClose())
    expect(holder.modal.modalProps.open).toBe(false)
  })
})

describe('useTransferModal submit', () => {
  it('registers the transfer, says so and closes', async () => {
    const holder = mount()

    act(() => holder.modal.openTransfer())
    await act(() => holder.modal.modalProps.onSubmit(draft))

    expect(create).toHaveBeenCalledWith({
      spreadsheetId: 'sheet-1',
      fromAccountId: 'a',
      toAccountId: 'b',
      amount: 250,
      date: '2026-10-27',
      note: ' کارت به کارت '
    })
    expect(showSuccess).toHaveBeenCalledWith('انتقال ثبت شد')
    expect(holder.modal.modalProps.open).toBe(false)
  })

  it('stays open and shows the failure briefly when everything was taken back', async () => {
    create.mockRejectedValueOnce(new TransferWriteError('برگردانده شد', true, new Error('x')))

    const holder = mount()

    act(() => holder.modal.openTransfer())
    await act(() => holder.modal.modalProps.onSubmit(draft))

    expect(holder.modal.modalProps.open).toBe(true)
    expect(showSuccess).not.toHaveBeenCalled()
    expect(handleSheetError).toHaveBeenCalledWith(expect.any(TransferWriteError), {
      fallbackMessage: 'خطا در ثبت انتقال',
      duration: undefined
    })
  })

  it('keeps the message up longer when the transfer was left half done', async () => {
    create.mockRejectedValueOnce(new TransferWriteError('نیمه‌کاره ماند', false, new Error('x')))

    const holder = mount()

    act(() => holder.modal.openTransfer())
    await act(() => holder.modal.modalProps.onSubmit(draft))

    expect(handleSheetError).toHaveBeenCalledWith(expect.any(TransferWriteError), {
      fallbackMessage: 'خطا در ثبت انتقال',
      duration: UNFINISHED_TRANSFER_TOAST_MS
    })
    expect(holder.modal.modalProps.saving).toBe(false)
  })
})
