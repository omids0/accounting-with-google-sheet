import { describe, expect, it } from 'vitest'

import {
  answerConfirmDelete,
  confirmDelete,
  confirmDeleteTitle,
  getConfirmDeleteRequest,
  undoableDeleteMessage
} from './confirmDelete'

describe('confirmDelete', () => {
  it('names what is deleted in the title and never asks a bare «حذف شود؟»', () => {
    expect(confirmDeleteTitle('چک ۱۲۳۴۵۶')).toBe('چک ۱۲۳۴۵۶ حذف شود؟')
    expect(confirmDeleteTitle('  ')).toBe('این مورد حذف شود؟')
  })

  it('says what goes and that it can be brought back', () => {
    const message = undoableDeleteMessage('طلب «وام»')

    expect(message).toContain('طلب «وام» پاک می‌شود')
    expect(message).toContain('بازگردانی')
  })

  it('resolves with the answer and closes the question', async () => {
    const asked = confirmDelete({ label: 'یادآوری', message: 'x' })

    expect(getConfirmDeleteRequest()?.label).toBe('یادآوری')
    answerConfirmDelete({ checked: true })

    await expect(asked).resolves.toEqual({ checked: true })
    expect(getConfirmDeleteRequest()).toBeNull()
  })

  it('resolves null when the user backs out', async () => {
    const asked = confirmDelete({ label: 'یادآوری', message: 'x' })

    answerConfirmDelete(null)

    await expect(asked).resolves.toBeNull()
  })

  it('calls off the older delete when a newer question replaces it', async () => {
    const first = confirmDelete({ label: 'الف', message: 'x' })
    const second = confirmDelete({ label: 'ب', message: 'y' })

    await expect(first).resolves.toBeNull()
    expect(getConfirmDeleteRequest()?.label).toBe('ب')
    answerConfirmDelete({ checked: false })
    await expect(second).resolves.toEqual({ checked: false })
  })

  it('ignores an answer when nothing is open', () => {
    expect(() => answerConfirmDelete(null)).not.toThrow()
  })
})

describe('confirmDelete wording', () => {
  it('carries a non-delete title and button for the archive question', async () => {
    const asked = confirmDelete({
      label: 'سفر عید',
      message: 'x',
      wording: { title: 'سفر عید بایگانی شود؟', confirmLabel: 'بایگانی', tone: 'default' }
    })

    expect(getConfirmDeleteRequest()?.wording?.confirmLabel).toBe('بایگانی')
    answerConfirmDelete({ checked: false })
    await expect(asked).resolves.toEqual({ checked: false })
  })
})
