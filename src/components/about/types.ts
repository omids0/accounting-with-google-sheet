import type { AppIconName } from '../AppIcon'

export interface AboutFeature {
  title: string
  description: string
}

export interface AboutFeatureGroup {
  id: string
  title: string
  icon: AppIconName
  summary: string
  features: AboutFeature[]
}
