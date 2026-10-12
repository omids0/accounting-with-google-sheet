import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'

// The APK release workflow names builds from the same field, so the two never drift.
import { version as APP_VERSION } from '../../../package.json'
import AppIcon from '../AppIcon'
import { ABOUT_CHANGELOG_GROUP, ABOUT_CHANGELOG_ID } from './aboutChangelogGroup'
import { ABOUT_FEATURE_GROUPS } from './aboutFeatures'
import AboutFeatureSection from './AboutFeatureSection'
import {
  aboutFooterClass,
  aboutHeroClass,
  aboutHeroIconClass,
  aboutHeroTaglineClass,
  aboutHeroTitleClass,
  aboutHeroVersionClass,
  aboutIntroClass,
  aboutPageClass
} from '../ui/aboutStyles'
import { cardClassName } from '../ui/Card'

export default function AboutPage() {
  const { hash } = useLocation()
  // «همه تغییرات» in «چه خبر؟» lands here with the changelog open.
  const fromWhatsNew = hash === `#${ABOUT_CHANGELOG_ID}`
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(fromWhatsNew ? [ABOUT_CHANGELOG_ID] : [])
  )

  useEffect(() => {
    if (!fromWhatsNew) return
    document.getElementById(`about-${ABOUT_CHANGELOG_ID}`)?.scrollIntoView({ block: 'center' })
  }, [fromWhatsNew])

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }, [])

  return (
    <div className={aboutPageClass}>
      <header className={cardClassName(aboutHeroClass)}>
        <div className={aboutHeroIconClass} aria-hidden="true">
          <AppIcon name="dashboard" size={36} />
        </div>
        <h1 className={aboutHeroTitleClass}>حساب کتاب</h1>
        <p className={aboutHeroTaglineClass}>
          اپ حسابداری با ذخیره‌سازی در Google Sheets — روی موبایل و دسکتاپ با چیدمان واکنش‌گرا؛
          داده‌های شما همیشه در اختیار خودتان است.
        </p>
        <p className={aboutHeroVersionClass}>نسخه {APP_VERSION}</p>
      </header>

      <p className={aboutIntroClass}>
        روی هر بخش بزنید تا باز شود؛ سپس هر قابلیت را جداگانه برای خواندن جزئیات باز کنید.
      </p>

      {[...ABOUT_FEATURE_GROUPS, ABOUT_CHANGELOG_GROUP].map(group => (
        <AboutFeatureSection
          key={group.id}
          group={group}
          expanded={expandedSections.has(group.id)}
          onToggle={() => toggleSection(group.id)}
        />
      ))}

      <footer className={cardClassName(aboutFooterClass)}>
        <p>
          داده‌ها در Google Drive شخصی شما ذخیره می‌شوند. برای ورود به Google ممکن است در برخی مناطق
          به VPN نیاز باشد.
        </p>
      </footer>
    </div>
  )
}
