import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      <div className="settings-section-items">{children}</div>
    </section>
  )
}
