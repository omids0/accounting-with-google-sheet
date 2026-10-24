import { describe, expect, it } from 'vitest'

import { padRowsToWidth } from './backupRestore'

describe('padRowsToWidth', () => {
  it('pads a row from an older backup to the tab width with empty cells', () => {
    const rows = [['a', 'b'], ['c', 'd', 'e', 'f'], []]

    expect(padRowsToWidth(rows, 4)).toEqual([
      ['a', 'b', '', ''],
      ['c', 'd', 'e', 'f'],
      ['', '', '', '']
    ])
  })

  it('never cuts a row that is wider, and leaves the input alone', () => {
    const rows = [['a', 'b', 'c']]

    expect(padRowsToWidth(rows, 2)).toEqual([['a', 'b', 'c']])
    expect(rows).toEqual([['a', 'b', 'c']])
  })
})
