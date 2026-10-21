import { can } from './buildingRoles'
import { buildingProfileRow, type BuildingProfile } from './buildingTemplate'
import { BUILDING_SHEET } from './sheetNames'
import { appendSheetRow, updateSheetRow } from './sheets'
import { getSheetDataRows } from './spreadsheetStore'
import { assertBuildingSpreadsheet } from './workspace'

/** The profile row sits right under the header of «ساختمان». */
const PROFILE_ROW_NUMBER = 2

/** What stops a profile from being saved; null when it is fine. */
export function profileError(profile: BuildingProfile): string | null {
  if (!profile.name.trim()) return 'نام ساختمان را وارد کنید'
  if (!(profile.floors >= 1)) return 'تعداد طبقه را درست وارد کنید'
  if (!(profile.defaultCharge >= 0)) return 'شارژ پیش‌فرض را درست وارد کنید'

  return null
}

/**
 * «مشخصات» and «شارژ» of the building settings: rewrites the one profile row. Charges already
 * issued keep their amounts; the next issue reads the new rules.
 */
export async function saveBuildingProfile(
  spreadsheetId: string,
  profile: BuildingProfile
): Promise<void> {
  assertBuildingSpreadsheet(spreadsheetId)
  if (!can('settings', spreadsheetId)) throw new Error('ویرایش مشخصات ساختمان مجاز نیست')

  const error = profileError(profile)

  if (error) throw new Error(error)

  const row = buildingProfileRow(profile, new Date().toLocaleString('fa-IR'))

  if (getSheetDataRows(spreadsheetId, BUILDING_SHEET)?.length) {
    await updateSheetRow(spreadsheetId, BUILDING_SHEET, PROFILE_ROW_NUMBER, row)
  } else {
    await appendSheetRow(spreadsheetId, BUILDING_SHEET, row)
  }
}
