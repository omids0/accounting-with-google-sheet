import { useState } from 'react'
import { useNavigate } from 'react-router'

import BridgePrefsSheet from './BridgePrefsSheet'
import { BUILDING_ROLES, optionLabel } from './buildingOptions'
import BuildingProfileSheet, { type ProfilePart } from './BuildingProfileSheet'
import BuildingSettingsRow, { type BuildingSettingsRowData } from './BuildingSettingsRow'
import { chargeSummary } from './chargeSummary'
import RowActionsSheet from './RowActionsSheet'
import { useReturnToPersonal } from './useReturnToPersonal'
import { useRoutedCards } from './useRoutedCards'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  getPathForTab,
  SETTINGS_BACKUP_PATH,
  SETTINGS_CATEGORIES_PATH,
  SETTINGS_REMINDERS_PATH,
  closeYearPath
} from '../../routes/paths'
import { readBridgePrefs } from '../../services/bridgePrefs'
import { setBuildingArchived } from '../../services/buildingArchive'
import { getManagedList, visibleItems } from '../../services/buildingLists'
import { getBuildingProfile } from '../../services/buildingProfile'
import { members } from '../../services/buildingRoles'
import type { BuildingProfile } from '../../services/buildingTemplate'
import { readCategoryList } from '../../services/categoryManage'
import { closeYearDefaultYear } from '../../services/closeYear'
import { getSettings } from '../../services/settings'
import { getSpreadsheetLabel } from '../../services/spreadsheetCatalog'
import { formatJalaliYear } from '../../utils/dateRange'
import { getTodayIso } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import ConfirmActionModal from '../ConfirmActionModal'
import SheetSwitchConfirmModal from '../settings/SheetSwitchConfirmModal'
import { journeyPageClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import { categoryListClass } from '../ui/categoryPageStyles'

const fa = (value: number) => toPersianDigits(String(value))

const joined = (id: 'EXPENSE_KINDS' | 'EXPENSE_PAYERS') =>
  visibleItems(getManagedList(id))
    .map(item => item.label)
    .join('، ')

/**
 * «تنظیمات ساختمان» (screen 24): ten rows and the way back to the personal workspace. The page
 * needs the `settings` permission (the route gate); backup, close-the-year, categories and the
 * reminders are the app's own tools, run on this spreadsheet. «بایگانی ساختمان» only flags the
 * registration on this device: the sheet stays as it is.
 */
export default function BuildingSettingsPage() {
  const navigate = useNavigate()
  useDataRefresh()

  const cards = useRoutedCards()
  const leave = useReturnToPersonal()
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const archive = useReturnToPersonal(() => setBuildingArchived(spreadsheetId, true))
  const [part, setPart] = useState<ProfilePart | null>(null)
  const [bridging, setBridging] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  // The bridge ticks save at once; this re-reads their summary after the sheet closes.
  const [, setVersion] = useState(0)

  const entryName = getSettings()?.spreadsheets?.find(entry => entry.id === spreadsheetId)?.name

  const profile: BuildingProfile = getBuildingProfile(spreadsheetId) ?? {
    name: getSpreadsheetLabel(entryName ?? ''),
    address: '',
    floors: 1,
    defaultCharge: 0,
    chargeMethod: 'fixed',
    issueDay: 1,
    dueDay: 10,
    vacancyRule: 'full'
  }

  const prefs = readBridgePrefs()

  const onOff = (value: boolean) => (value ? 'روشن' : 'خاموش')

  const list = members(spreadsheetId)

  const rows: BuildingSettingsRowData[] = [
    {
      id: 'profile',
      title: 'مشخصات',
      meta: `${profile.name} · ${fa(profile.floors)} طبقه${
        profile.address ? ` · ${profile.address}` : ''
      }`,
      onClick: () => setPart('details')
    },
    {
      id: 'charge',
      title: 'شارژ',
      meta: chargeSummary(profile),
      onClick: () => setPart('charge')
    },
    {
      id: 'cards',
      title: 'کارت‌های صندوق',
      meta: cards.length
        ? `${cards.join(' · ')} · پیامک این کارت‌ها برای این ساختمان ثبت می‌شود`
        : 'کارتی ثبت نشده؛ کارت را در حساب بانکی صندوق بگذار',
      onClick: () => navigate(getPathForTab('building-fund'))
    },
    {
      id: 'categories',
      title: 'دسته‌ها',
      meta: `${fa(readCategoryList('expense').length)} دستهٔ هزینه · ${fa(
        readCategoryList('income').length
      )} درآمد · ویرایش`,
      onClick: () => navigate(SETTINGS_CATEGORIES_PATH)
    },
    {
      id: 'members',
      title: 'اعضا و دسترسی‌ها',
      meta: list.length
        ? `${fa(list.length)} عضو: ${list
            .map(member => optionLabel(BUILDING_ROLES, member.role))
            .join(' · ')}`
        : 'هنوز عضوی ثبت نشده',
      onClick: () => navigate(getPathForTab('building-members'))
    },
    {
      id: 'lists',
      title: 'فهرست‌ها',
      meta: `نوع هزینه (${joined('EXPENSE_KINDS')}) · پرداخت‌کننده (${joined('EXPENSE_PAYERS')})`,
      onClick: () => navigate(getPathForTab('building-lists'))
    },
    {
      id: 'bridge',
      title: 'هماهنگی با حساب شخصی',
      meta: `ثبت طلب مدیر: ${onOff(prefs.pocket)} · ثبت شارژ واحد من: ${onOff(prefs.ownUnit)}`,
      onClick: () => setBridging(true)
    },
    {
      id: 'reminders',
      title: 'یادآوری‌ها',
      meta: 'اعلان‌ها و یادآوری سررسیدها',
      onClick: () => navigate(SETTINGS_REMINDERS_PATH)
    },
    {
      id: 'tools',
      title: 'پشتیبان و بستن سال',
      meta: 'نسخهٔ پشتیبان از اطلاعات این ساختمان',
      onClick: () => setToolsOpen(true)
    },
    {
      id: 'archive',
      title: 'بایگانی ساختمان',
      meta: 'از فهرست ساختمان‌ها کنار می‌رود؛ اطلاعاتش پاک نمی‌شود',
      danger: true,
      onClick: () => setArchiving(true)
    }
  ]

  const year = closeYearDefaultYear(getTodayIso())

  return (
    <div className={journeyPageClass}>
      <ul className={categoryListClass} aria-label="تنظیمات ساختمان">
        {rows.map(row => (
          <BuildingSettingsRow key={row.id} row={row} />
        ))}
      </ul>

      <Button type="button" onClick={leave.returnToPersonal}>
        ↩ برگشت به حساب شخصی
      </Button>

      <BuildingProfileSheet
        part={part}
        spreadsheetId={spreadsheetId}
        profile={profile}
        onClose={() => setPart(null)}
      />
      <BridgePrefsSheet
        open={bridging}
        buildingName={profile.name}
        onClose={() => {
          setBridging(false)
          setVersion(value => value + 1)
        }}
      />
      <RowActionsSheet
        open={toolsOpen}
        title="پشتیبان و بستن سال"
        onClose={() => setToolsOpen(false)}
        actions={[
          { id: 'backup', label: 'پشتیبان', onClick: () => navigate(SETTINGS_BACKUP_PATH) },
          {
            id: 'close-year',
            label: `بستن سال ${formatJalaliYear(year)}`,
            onClick: () => navigate(closeYearPath(year))
          }
        ]}
      />
      <ConfirmActionModal
        open={archiving}
        title="بایگانی ساختمان"
        message={`«${profile.name}» از فهرست ساختمان‌ها کنار می‌رود و به حساب شخصی برمی‌گردی. اطلاعات ساختمان پاک نمی‌شود و هر وقت خواستی از «بایگانی‌شده» بازش می‌گردانی.`}
        confirmLabel="بایگانی"
        cancelLabel="انصراف"
        onClose={() => setArchiving(false)}
        onConfirm={() => {
          setArchiving(false)
          archive.returnToPersonal()
        }}
      />
      <SheetSwitchConfirmModal {...leave.modalProps} />
      <SheetSwitchConfirmModal {...archive.modalProps} />
    </div>
  )
}
