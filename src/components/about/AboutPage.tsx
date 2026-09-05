import { useCallback, useState } from 'react'

import AppIcon from '../AppIcon'
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

const APP_VERSION = '1.0.0'

export default function AboutPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())

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
          <AppIcon name="dashboard" size={36} strokeWidth={1.5} />
        </div>
        <h1 className={aboutHeroTitleClass}>حسابداری شخصی</h1>
        <p className={aboutHeroTaglineClass}>
          اپ موبایل‌فرست حسابداری با ذخیره‌سازی در Google Sheets — داده‌های شما همیشه در اختیار
          خودتان است.
        </p>
        <p className={aboutHeroVersionClass}>نسخه {APP_VERSION}</p>
      </header>

      <p className={aboutIntroClass}>
        روی هر بخش بزنید تا باز شود؛ سپس هر قابلیت را جداگانه برای خواندن جزئیات باز کنید.
      </p>

      {ABOUT_FEATURE_GROUPS.map(group => (
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
