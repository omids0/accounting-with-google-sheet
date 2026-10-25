import { describe, expect, it } from 'vitest'

import { changelog } from './aboutChangelog'
import { ABOUT_CHANGELOG_GROUP } from './aboutChangelogGroup'
import { compareVersions, WHATS_NEW_MAX_ITEMS } from '../../services/whatsNew'

describe('changelog', () => {
  it('lists versions newest first, each with a release day that never goes back in time', () => {
    for (let i = 1; i < changelog.length; i += 1) {
      expect(compareVersions(changelog[i - 1].version, changelog[i].version)).toBeGreaterThan(0)
      expect(changelog[i - 1].date! >= changelog[i].date!).toBe(true)
    }
  })

  it('gives every version an ISO date and at most three items', () => {
    for (const entry of changelog) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.items.length).toBeLessThanOrEqual(WHATS_NEW_MAX_ITEMS)
    }
  })

  it('shows the Jalali release day next to the version in About', () => {
    const [latest] = ABOUT_CHANGELOG_GROUP.features

    expect(latest.title).toBe(`نسخه ${changelog[0].version} — ۳ آبان ۱۴۰۵`)
  })

  it('keeps the title plain for an entry without a date', () => {
    expect(ABOUT_CHANGELOG_GROUP.features.every(feature => feature.title.startsWith('نسخه '))).toBe(
      true
    )
  })
})
