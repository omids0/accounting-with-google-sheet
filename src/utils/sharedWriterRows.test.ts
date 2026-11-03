import { describe, expect, it } from 'vitest'

import { isEditedByOther, sharedWriterRows } from './sharedWriterRows'

describe('sharedWriterRows', () => {
  it('names the creator and the last editor when they differ', () => {
    expect(sharedWriterRows('nima@x.com', 'mina@x.com')).toEqual({
      created: { label: 'ایجاد', email: 'nima@x.com' },
      edited: { label: 'آخرین ویرایش', email: 'mina@x.com' }
    })
  })

  it('keeps the generic «ثبت‌کننده» row when the creator wrote last (any case or spacing)', () => {
    expect(sharedWriterRows('Nima@x.com', ' nima@x.com ')).toBeNull()
  })

  it('keeps it for a row with no creator or no writer (older rows)', () => {
    expect(sharedWriterRows('', 'mina@x.com')).toBeNull()
    expect(sharedWriterRows('nima@x.com', undefined)).toBeNull()
    expect(isEditedByOther(undefined, undefined)).toBe(false)
  })
})
