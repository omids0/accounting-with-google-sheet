import { describe, expect, it } from 'vitest'

import { recordDeleteMessage, SHARED_COPY_DELETE_NOTE } from './recordDeleteMessage'
import { undoableDeleteMessage } from '../../utils/confirmDelete'

describe('recordDeleteMessage', () => {
  const label = 'تراکنش «میوه»'

  it('is the plain undoable message for a record with no shared copy', () => {
    expect(recordDeleteMessage(label, false)).toBe(undoableDeleteMessage(label))
  })

  it('adds one line about the shared copy and the next window', () => {
    const message = recordDeleteMessage(label, true)

    expect(message).toBe(`${undoableDeleteMessage(label)}\n${SHARED_COPY_DELETE_NOTE}`)
    expect(SHARED_COPY_DELETE_NOTE).toBe(
      'این رکورد در حساب مشترک هم هست؛ در پنجرهٔ بعد انتخاب می‌کنی که آنجا هم حذف شود یا نه.'
    )
  })
})
