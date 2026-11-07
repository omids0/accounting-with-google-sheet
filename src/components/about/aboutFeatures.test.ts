import { describe, expect, it } from 'vitest'

import { ABOUT_FEATURE_GROUPS } from './aboutFeatures'
import { PARENT_RAW_SHEET_NOTE } from '../family/familyCopy'

describe('About feature groups', () => {
  it('registers each group once, with a title, summary and described features', () => {
    const ids = ABOUT_FEATURE_GROUPS.map(group => group.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const group of ABOUT_FEATURE_GROUPS) {
      expect(group.title).toBeTruthy()
      expect(group.summary).toBeTruthy()
      for (const feature of group.features) {
        expect(feature.title).toBeTruthy()
        expect(feature.description).toBeTruthy()
      }
    }
  })

  it('documents the parents feature with its honest limits', () => {
    const group = ABOUT_FEATURE_GROUPS.find(item => item.id === 'parents')

    expect(group?.title).toBe('نظارت والدین')

    const text = group?.features.map(feature => feature.description).join(' ') ?? ''

    expect(text).toContain('فرزندان من')
    expect(text).toContain('والدین من')
    expect(text).toContain('گوگل‌درایو')
    expect(text).toContain('دسترسی قطع شد')
    expect(text).toContain('قطع دسترسی فقط از گوگل‌درایو ممکن است')
    expect(PARENT_RAW_SHEET_NOTE).toContain('گوگل‌شیت')
  })

  it('describes the quick SMS sheet in the bank-SMS group', () => {
    const group = ABOUT_FEATURE_GROUPS.find(item => item.id === 'bank-sms')

    expect(group?.features.map(feature => feature.title)).toContain('ثبت سریع از اعلان پیامک')
  })
})
