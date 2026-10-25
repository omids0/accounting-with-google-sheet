import LayoutMenuGroup from './LayoutMenuGroup'
import LayoutMenuLink from './LayoutMenuLink'
import LayoutMenuSection from './LayoutMenuSection'
import LayoutReportsSubmenu from './LayoutReportsSubmenu'
import LayoutUpdateItem from './LayoutUpdateItem'
import {
  CALC_MENU_ITEMS,
  MENU_ABOUT_LINK,
  MENU_INVITE_LINK,
  MENU_APP_LABEL,
  MENU_BANK_SMS_LINK,
  MENU_COMMITMENT_LINKS,
  MENU_COMMITMENTS_LABEL,
  MENU_MONEY_LABEL,
  MENU_MONEY_LINKS,
  MENU_MORE_LABEL,
  MENU_MORE_LINKS
} from './navMenuGroups'
import TabNavLink from './TabNavLink'
import { TAB_TITLES, type Tab } from './types'
import { SETTINGS_PATH } from '../../routes/paths'
import { isBankSmsAvailable } from '../../services/bankSmsNative'
import AppIcon from '../AppIcon'
import {
  appMenuItemClass,
  appMenuItemIconClass,
  appMenuItemLabelClass,
  appMenuItemsClass
} from '../ui/layoutStyles'

export interface LayoutMenuNavProps {
  tab: Tab
  showSettings: boolean
  isReportTab: boolean
  isCalculationTab: boolean
  isTimesheetTab: boolean
  reportsMenuExpanded: boolean
  onToggleReportsMenu: () => void
  calcMenuExpanded: boolean
  onToggleCalcMenu: () => void
  timesheetMenuExpanded: boolean
  onToggleTimesheetMenu: () => void
  onTabChange: (tab: Tab) => void
  onOpenSettings: () => void
  onOpenTimesheetsList: () => void
}

/** The menu's four groups: پول, تعهدات, بیشتر and اپ. */
export default function LayoutMenuNav(props: LayoutMenuNavProps) {
  const { tab, showSettings, onTabChange } = props
  const currentTab = showSettings ? null : tab
  const onPage = (...tabs: Tab[]) => currentTab !== null && tabs.includes(currentTab)
  const linkProps = { currentTab, onTabChange }

  return (
    <div className={appMenuItemsClass}>
      <LayoutMenuSection label={MENU_MONEY_LABEL}>
        {MENU_MONEY_LINKS.map(entry => (
          <LayoutMenuLink key={entry.tab} entry={entry} {...linkProps} />
        ))}
      </LayoutMenuSection>

      <LayoutMenuSection label={MENU_COMMITMENTS_LABEL}>
        {MENU_COMMITMENT_LINKS.map(entry => (
          <LayoutMenuLink key={entry.tab} entry={entry} {...linkProps} />
        ))}
      </LayoutMenuSection>

      <LayoutMenuSection label={MENU_MORE_LABEL}>
        {MENU_MORE_LINKS.map(entry => (
          <LayoutMenuLink key={entry.tab} entry={entry} {...linkProps} />
        ))}
        <LayoutMenuGroup
          label="گزارشات"
          icon="chart"
          active={props.isReportTab}
          expanded={props.reportsMenuExpanded}
          onToggle={props.onToggleReportsMenu}
        >
          <LayoutReportsSubmenu tab={tab} onTabChange={onTabChange} />
        </LayoutMenuGroup>
        <LayoutMenuGroup
          label="محاسبات"
          icon="calculator"
          active={props.isCalculationTab}
          expanded={props.calcMenuExpanded}
          onToggle={props.onToggleCalcMenu}
          submenu
        >
          {CALC_MENU_ITEMS.map(item => (
            <TabNavLink
              key={item.tab}
              tab={item.tab}
              active={onPage(...item.activeTabs)}
              className={appMenuItemClass(onPage(...item.activeTabs), 'sub')}
              onNavigate={() => onTabChange(item.tab)}
            >
              {TAB_TITLES[item.tab]}
            </TabNavLink>
          ))}
        </LayoutMenuGroup>
        <LayoutMenuGroup
          label="تایم‌شیت"
          icon="clock"
          active={props.isTimesheetTab}
          expanded={props.timesheetMenuExpanded}
          onToggle={props.onToggleTimesheetMenu}
          submenu
        >
          <TabNavLink
            tab="timesheets"
            active={props.isTimesheetTab}
            className={appMenuItemClass(props.isTimesheetTab, 'sub')}
            onNavigate={props.onOpenTimesheetsList}
          >
            لیست تایم‌شیت‌ها
          </TabNavLink>
        </LayoutMenuGroup>
        {isBankSmsAvailable() && <LayoutMenuLink entry={MENU_BANK_SMS_LINK} {...linkProps} />}
      </LayoutMenuSection>

      <LayoutMenuSection label={MENU_APP_LABEL}>
        <TabNavLink
          to={SETTINGS_PATH}
          active={showSettings}
          className={appMenuItemClass(showSettings)}
          onNavigate={props.onOpenSettings}
        >
          <span className={appMenuItemIconClass(showSettings)}>
            <AppIcon name="settings" size={20} />
          </span>
          <span className={appMenuItemLabelClass}>تنظیمات</span>
        </TabNavLink>
        <LayoutMenuLink entry={MENU_ABOUT_LINK} {...linkProps} />
        <LayoutMenuLink entry={MENU_INVITE_LINK} {...linkProps} />
        <LayoutUpdateItem />
      </LayoutMenuSection>
    </div>
  )
}
