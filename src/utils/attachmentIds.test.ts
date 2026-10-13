import { describe, expect, it } from 'vitest'

import {
  attachmentDeleteMessage,
  fileIdsToDelete,
  shouldAskAttachmentDelete
} from './attachmentDelete'
import {
  keepAttachmentCell,
  parseAttachmentIds,
  serializeAttachmentIds,
  withAttachmentCell
} from './attachmentIds'

describe('parseAttachmentIds', () => {
  it('reads an older row without the column as no attachments', () => {
    expect(parseAttachmentIds(undefined)).toEqual([])
    expect(parseAttachmentIds('')).toEqual([])
    expect(parseAttachmentIds('   ')).toEqual([])
  })

  it('splits comma separated ids, trimming blanks and repeats', () => {
    expect(parseAttachmentIds('a1, b2,,a1 ,c3')).toEqual(['a1', 'b2', 'c3'])
  })

  it('accepts the Persian comma a hand edit may leave behind', () => {
    expect(parseAttachmentIds('a1،b2')).toEqual(['a1', 'b2'])
  })

  it('round-trips through serialize', () => {
    const ids = ['1AbC-_x', '2DeF']

    expect(parseAttachmentIds(serializeAttachmentIds(ids))).toEqual(ids)
    expect(serializeAttachmentIds([])).toBe('')
    expect(serializeAttachmentIds(['a', 'a', ' b '])).toBe('a,b')
  })
})

describe('keepAttachmentCell', () => {
  const stored = ['id', 'x', 'y', 'f1,f2']

  it('keeps stored ids when a rebuilt row leaves the cell empty', () => {
    expect(keepAttachmentCell(['id', 'X', 'Y', ''], stored, 3)).toEqual(['id', 'X', 'Y', 'f1,f2'])
  })

  it('keeps them when a fixed-layout row is shorter than the column', () => {
    expect(keepAttachmentCell(['id', 'X'], stored, 3)).toEqual(['id', 'X', '', 'f1,f2'])
  })

  it('lets a row that carries its own ids win', () => {
    expect(keepAttachmentCell(['id', 'X', 'Y', 'f3'], stored, 3)).toEqual(['id', 'X', 'Y', 'f3'])
  })

  it('changes nothing without a column or a stored row', () => {
    const next = ['id', 'X']

    expect(keepAttachmentCell(next, stored, -1)).toBe(next)
    expect(keepAttachmentCell(next, null, 3)).toBe(next)
    expect(keepAttachmentCell(next, ['id', 'x', 'y', ''], 3)).toBe(next)
  })
})

describe('withAttachmentCell', () => {
  it('pads up to the column and leaves the source row untouched', () => {
    const row = ['a']

    expect(withAttachmentCell(row, 3, 'f1')).toEqual(['a', '', '', 'f1'])
    expect(row).toEqual(['a'])
  })
})

describe('delete question branching', () => {
  it('asks only when the parent holds uploaded files', () => {
    expect(shouldAskAttachmentDelete([])).toBe(false)
    expect(shouldAskAttachmentDelete(['f1'])).toBe(true)
  })

  it('deletes the files by default and on «بله»', () => {
    expect(fileIdsToDelete(['f1', 'f2'])).toEqual(['f1', 'f2'])
    expect(fileIdsToDelete(['f1'], 'delete')).toEqual(['f1'])
  })

  it('keeps every file on «نه»', () => {
    expect(fileIdsToDelete(['f1', 'f2'], 'keep')).toEqual([])
  })

  it('names the file count in Persian digits', () => {
    expect(attachmentDeleteMessage(2)).toContain('۲ فایل پیوست')
  })
})
