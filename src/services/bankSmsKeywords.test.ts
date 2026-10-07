import { describe, expect, it } from 'vitest'

import { BANK_SMS_KEYWORDS } from './bankSmsText'
import javaFilter from '../../android/app/src/main/java/com/omids0/accounting/banksms/BankSmsFilter.java?raw'

describe('bank SMS prefilter keywords', () => {
  it('match the native BankSmsFilter list', () => {
    const block = javaFilter.match(/BANK_SMS_KEYWORDS = \{([\s\S]*?)\}/)?.[1] ?? ''
    const javaKeywords = [...block.matchAll(/"([^"]+)"/g)].map(match => match[1])

    expect(javaKeywords).toEqual(BANK_SMS_KEYWORDS)
  })
})
