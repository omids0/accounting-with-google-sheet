import type { ReactNode } from 'react'

export default function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="tab-panel" hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  )
}
