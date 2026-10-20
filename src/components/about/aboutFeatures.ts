import { ABOUT_BUILDING_FEATURE_GROUP } from './aboutFeatureGroupsBuilding'
import { ABOUT_FEATURE_GROUPS_CORE } from './aboutFeatureGroupsCore'
import { ABOUT_FEATURE_GROUPS_EXTENDED } from './aboutFeatureGroupsExtended'
import { ABOUT_PLATFORM_GROUP } from './aboutFeatureGroupsPlatform'
import { ABOUT_SHARED_GROUP } from './aboutFeatureGroupsShared'
import { ABOUT_FEATURE_GROUPS_TOOLS } from './aboutFeatureGroupsTools'
import { ABOUT_VEHICLE_FEATURE_GROUP } from './aboutFeatureGroupsVehicle'
import type { AboutFeatureGroup } from './types'

export const ABOUT_FEATURE_GROUPS: AboutFeatureGroup[] = [
  ...ABOUT_FEATURE_GROUPS_CORE,
  ...ABOUT_FEATURE_GROUPS_EXTENDED,
  ABOUT_BUILDING_FEATURE_GROUP,
  ...ABOUT_FEATURE_GROUPS_TOOLS,
  ABOUT_SHARED_GROUP,
  ABOUT_PLATFORM_GROUP,
  ABOUT_VEHICLE_FEATURE_GROUP
]
