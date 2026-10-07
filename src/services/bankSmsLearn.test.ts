import { describe, expect, it } from 'vitest'

import { guessTemplate } from './bankSmsGuess'
import { labelWord, learnedKeywords } from './bankSmsLearn'
import type { SmsTemplate, SmsTemplatePart } from '../types'

const capturedRoles = (parts: SmsTemplatePart[]) =>
  parts.flatMap(part => (part.kind === 'slot' && part.role !== 'ignore' ? [part.role] : []))

function saved(
  parts: SmsTemplatePart[],
  direction: SmsTemplate['direction'] = 'debit'
): SmsTemplate {
  return { id: 't', createdAt: '', accountId: 'a', direction, unit: 'rial', parts }
}

describe('labelWord', () => {
  it('takes the last word before a slot without its punctuation', () => {
    expect(labelWord('بانک ملت برداشت: ')).toBe('برداشت')
    expect(labelWord(' : ')).toBe('')
  })
})

describe('learning from saved templates', () => {
  // The user taught the app that «باقی» labels the balance.
  const taught = saved([
    { kind: 'text', value: 'بانک آینده برداشت ' },
    { kind: 'slot', role: 'amount' },
    { kind: 'text', value: ' باقی ' },
    { kind: 'slot', role: 'balance' }
  ])

  it('collects confirmed labels per role', () => {
    expect(learnedKeywords([taught])).toEqual([
      ['amount', ['برداشت']],
      ['balance', ['باقی']]
    ])
  })

  it('uses a learned label for a different bank', () => {
    const sample = 'بانک دی خرید 5,000 باقی 70,000'

    expect(capturedRoles(guessTemplate(sample).parts)).toEqual(['amount'])
    expect(capturedRoles(guessTemplate(sample, [taught]).parts)).toEqual(['amount', 'balance'])
  })

  it('reuses the roles and direction of a template with the same skeleton', () => {
    const corrected = saved(
      [
        { kind: 'text', value: 'بانک دی ' },
        { kind: 'slot', role: 'ignore' },
        { kind: 'text', value: ' ' },
        { kind: 'slot', role: 'amount' }
      ],
      'credit'
    )

    expect(guessTemplate('بانک دی 1404 250,000', [corrected])).toMatchObject({
      direction: 'credit',
      parts: corrected.parts
    })
  })
})
