import type { LayoutMenuNavProps } from './LayoutMenuNav'
import {
  MENU_ABOUT_LINK,
  MENU_BANK_SMS_LINK,
  MENU_COMMITMENT_LINKS,
  MENU_MONEY_LINKS,
  MENU_MORE_LINKS,
  type MenuLinkEntry
} from './navMenuGroups'
import TabNavLink from './TabNavLink'
import { TAB_TITLES } from './types'
import { SETTINGS_PATH } from '../../routes/paths'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import { useAppUpdateStore } from '../../stores/appUpdateStore'
import AppIcon from '../AppIcon'
import type { AppIconName } from '../appIcon/types'
import {
  appMenuRailClass,
  appRailDividerClass,
  appRailItemClass,
  appRailTooltipClass,
  appRailUpdateDotClass
} from '../ui/layoutStyles'

interface LayoutMenuRailProps extends LayoutMenuNavProps {
  menuOpen: boolean
  onOpenMenu: () => void
}

function RailLabel({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <>
      <AppIcon name={icon} size={20} />
      <span className={appRailTooltipClass} aria-hidden="true">
        {label}
      </span>
    </>
  )
}

/**
 * Tablet (768–1279px) navigation: the menu's links as a 64px icon column. The
 * collapsible groups (reports, calculations, timesheets) open the full drawer.
 */
export default function LayoutMenuRail(props: LayoutMenuRailProps) {
  const { tab, showSettings, onTabChange, onOpenMenu } = props
  const currentTab = showSettings ? null : tab
  const updateAvailable = useAppUpdateStore(state => !!state.update)

  const link = (entry: MenuLinkEntry) => {
    const active = currentTab !== null && (entry.activeTabs ?? [entry.tab]).includes(currentTab)
    const label = entry.label ?? TAB_TITLES[entry.tab]

    return (
      <TabNavLink
        key={entry.tab}
        tab={entry.tab}
        active={active}
        className={appRailItemClass(active)}
        aria-label={label}
        onNavigate={() => onTabChange(entry.tab)}
      >
        <RailLabel icon={entry.icon} label={label} />
      </TabNavLink>
    )
  }

  const group = (
    label: string,
    icon: AppIconName,
    active: boolean,
    expanded: boolean,
    toggle: () => void
  ) => (
    <button
      type="button"
      className={appRailItemClass(active)}
      aria-label={label}
      onClick={() => {
        if (!expanded) toggle()
        onOpenMenu()
      }}
    >
      <RailLabel icon={icon} label={label} />
    </button>
  )

  return (
    <nav className={appMenuRailClass} aria-label="میان‌بر منو">
      <button
        type="button"
        className={appRailItemClass(props.menuOpen)}
        onClick={onOpenMenu}
        aria-label={updateAvailable ? 'باز کردن منو — به‌روزرسانی موجود' : 'باز کردن منو'}
        aria-expanded={props.menuOpen}
      >
        <RailLabel icon="menu" label="منو" />
        {updateAvailable && <span className={appRailUpdateDotClass} aria-hidden="true" />}
      </button>
      <span className={appRailDividerClass} />
      {MENU_MONEY_LINKS.map(link)}
      <span className={appRailDividerClass} />
      {MENU_COMMITMENT_LINKS.map(link)}
      <span className={appRailDividerClass} />
      {MENU_MORE_LINKS.map(link)}
      {group(
        'گزارشات',
        'chart',
        props.isReportTab,
        props.reportsMenuExpanded,
        props.onToggleReportsMenu
      )}
      {group(
        'محاسبات',
        'calculator',
        props.isCalculationTab,
        props.calcMenuExpanded,
        props.onToggleCalcMenu
      )}
      {group(
        'تایم‌شیت',
        'clock',
        props.isTimesheetTab,
        props.timesheetMenuExpanded,
        props.onToggleTimesheetMenu
      )}
      {isBankSmsAvailable() && link(MENU_BANK_SMS_LINK)}
      <span className="flex-1" />
      <TabNavLink
        to={SETTINGS_PATH}
        active={showSettings}
        className={appRailItemClass(showSettings)}
        aria-label="تنظیمات"
        onNavigate={props.onOpenSettings}
      >
        <RailLabel icon="settings" label="تنظیمات" />
      </TabNavLink>
      {link(MENU_ABOUT_LINK)}
    </nav>
  )
}
