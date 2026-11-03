import { describe, expect, it } from 'vitest'

import { informSentence } from './informNoticeText'
import type { SharedNotice } from '../../services/sharedNotices'

const base: SharedNotice = {
  recordRef: 'record:c1',
  field: 'amount',
  old: '800000',
  new: '850000',
  by: 'mina@x.com',
  time: '',
  kind: 'edit',
  title: 'قبض برق',
  inform: true
}
const nameOf = (email: string) => (email === 'sara@x.com' ? 'سارا' : email)
const digits = (text: string) => text.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))

describe('informSentence', () => {
  it('an amount edit reads «مبلغ «…» را از X به Y تغییر داد»', () => {
    const line = informSentence(base, 'مادر', nameOf)

    expect(line).toMatch(/^مادر مبلغ «قبض برق» را از .+ به .+ تغییر داد$/)
    expect(digits(line)).toMatch(/از 800.?000 به 850.?000 \S+ تغییر داد$/)
  })

  it('a delete reads ««…» را حذف کرد»', () => {
    expect(
      informSentence({ ...base, kind: 'delete', field: 'delete', new: '' }, 'مادر', nameOf)
    ).toBe('مادر «قبض برق» را حذف کرد')
  })

  it('names the other fields too and falls back to «یک ثبت»', () => {
    expect(
      informSentence({ ...base, field: 'category', old: 'خوراک', new: 'قبض' }, 'مادر', nameOf)
    ).toBe('مادر دستهٔ «قبض برق» را از «خوراک» به «قبض» تغییر داد')
    expect(
      informSentence({ ...base, field: 'title', old: 'برق', new: 'قبض برق' }, 'مادر', nameOf)
    ).toBe('مادر عنوان «برق» را به «قبض برق» تغییر داد')
    expect(
      informSentence(
        { ...base, field: 'split', old: 'equal', new: 'only:sara@x.com' },
        'مادر',
        nameOf
      )
    ).toBe('مادر تقسیم «قبض برق» را از نصف‌نصف به فقط برای سارا تغییر داد')
    expect(
      informSentence({ ...base, title: '', kind: 'delete', field: 'delete' }, 'مادر', nameOf)
    ).toBe('مادر «یک ثبت» را حذف کرد')
  })
})
