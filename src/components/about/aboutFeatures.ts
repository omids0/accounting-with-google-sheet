import { ABOUT_FEATURE_GROUPS_CORE } from './aboutFeatureGroupsCore'
import { ABOUT_FEATURE_GROUPS_EXTENDED } from './aboutFeatureGroupsExtended'
import { ABOUT_FEATURE_GROUPS_TOOLS } from './aboutFeatureGroupsTools'
import { ABOUT_VEHICLE_FEATURE_GROUP } from './aboutFeatureGroupsVehicle'
import type { AboutFeatureGroup } from './types'

export const ABOUT_FEATURE_GROUPS: AboutFeatureGroup[] = [
  ...ABOUT_FEATURE_GROUPS_CORE,
  ...ABOUT_FEATURE_GROUPS_EXTENDED,
  ...ABOUT_FEATURE_GROUPS_TOOLS,
  ABOUT_VEHICLE_FEATURE_GROUP
]
