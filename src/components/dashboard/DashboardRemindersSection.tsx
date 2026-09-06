import {
  dashboardReminderMainClass,
  dashboardReminderMetaClass,
  dashboardReminderRowClass,
  dashboardReminderTitleClass,
  dashboardRemindersCardClass,
  dashboardRemindersHeaderClass,
  dashboardRemindersHintClass,
  dashboardRemindersIconClass,
  dashboardRemindersListClass,
  dashboardRemindersTitleClass
} from './dashboardReminderStyles'
import type { DashboardReminderItem } from '../../services/dashboardReminders'
import type { DueDateStatus } from '../../services/reports'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import AppIcon from '../AppIcon'
import MoneyDisplay from '../MoneyDisplay'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { emptyTextClass } from '../ui/displayStyles'
import { cardHeaderRowClass } from '../ui/recordsStyles'
import { reportDueBadgeClass, reportDueItemEndClass } from '../ui/toolsPageStyles'

const STATUS_LABELS: Record<DueDateStatus, string> = {
  overdue: 'معوق',
  today: 'امروز',
  upcoming: 'پیش‌رو'
}

type DashboardRemindersSectionProps = {
  items: DashboardReminderItem[]
  onViewAll?: () => void
}

function ReminderDueBadge({ status }: { status: DueDateStatus }) {
  return <span className={reportDueBadgeClass(status)}>{STATUS_LABELS[status]}</span>
}

export default function DashboardRemindersSection({
  items,
  onViewAll
}: DashboardRemindersSectionProps) {
  return (
    <Card className={dashboardRemindersCardClass}>
      <div className={cardHeaderRowClass}>
        <div className={dashboardRemindersHeaderClass}>
          <div className="dashboard-reminders-title-wrap">
            <span className={dashboardRemindersIconClass} aria-hidden="true">
              <AppIcon name="bell" />
            </span>
            <h3 className={dashboardRemindersTitleClass}>یادآوری‌های پیش‌رو</h3>
          </div>
        </div>
        {onViewAll ? (
          <Button type="button" variant="secondary" size="sm" onClick={onViewAll}>
            تنظیمات یادآوری
          </Button>
        ) : null}
      </div>

      <p className={dashboardRemindersHintClass}>
        اقساط، چک، بدهی و مواعد شخصی تا ۳۰ روز آینده و موارد معوق
      </p>

      {!items.length ? (
        <p className={emptyTextClass}>یادآوری فعالی در این بازه ثبت نشده</p>
      ) : (
        <div className={dashboardRemindersListClass}>
          {items.map((item, index) => (
            <div
              key={item.id}
              className={dashboardReminderRowClass}
              style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
            >
              <div className={dashboardReminderMainClass}>
                <div className={dashboardReminderTitleClass}>{item.title}</div>
                <div className={dashboardReminderMetaClass}>
                  {item.kindLabel}
                  {item.subtitle ? ` · ${item.subtitle}` : ''} · موعد:{' '}
                  {formatIsoDatePersian(item.dueDate)}
                </div>
              </div>
              <div className={reportDueItemEndClass}>
                <ReminderDueBadge status={item.status} />
                {item.amount > 0 ? (
                  <MoneyDisplay amount={item.amount} size="record" tone="primary" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
