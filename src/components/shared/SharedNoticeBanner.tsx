import { useState } from 'react'

import SharedNoticeSheet, { noticeSentence, noticeValue } from './SharedNoticeSheet'
import { useSharedNotices } from '../../hooks/useSharedNotices'
import type { StoredNotice } from '../../services/sharedNotices'
import { getSharingInfo, writerLabel } from '../../services/sharing'
import AppIcon from '../AppIcon'
import { alertClassName } from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

interface SharedNoticeBannerProps {
  /** Inside the personal edit form: only this record's notices, as the save warning. */
  recordRef?: string
  /** The personal record changed (the list reloads). */
  onApplied?: () => void
}

/**
 * «<partner> مبلغ «<title>» را در حساب مشترک عوض کرد: از X به Y» with «بررسی» (shared home, the
 * personal records list, «فضاهای من»); in the personal edit form, the warning that saving replaces
 * the partner's change, with a link to it.
 */
export default function SharedNoticeBanner({ recordRef, onApplied }: SharedNoticeBannerProps) {
  const { sharedId, notices } = useSharedNotices()
  const [open, setOpen] = useState<StoredNotice | null>(null)
  const list = recordRef ? notices.filter(notice => notice.recordRef === recordRef) : notices
  const info = getSharingInfo(sharedId)
  const nameOf = (email: string) => writerLabel(email, info).name

  const sheet = (
    <SharedNoticeSheet
      sharedId={sharedId}
      notice={open}
      nameOf={nameOf}
      inForm={!!recordRef}
      onApplied={onApplied}
      onClose={() => setOpen(null)}
    />
  )

  if (recordRef) {
    if (!list.length) return sheet

    return (
      // `sharedAlertClass`, spelled out: importing it would split sharedStyles into its own chunk.
      <div className={alertClassName('warning', 'mb-[var(--form-gap)] shrink-0')} role="alert">
        {list[0].kind === 'delete'
          ? 'شریک نسخهٔ این ثبت را از حساب مشترک حذف کرده؛ با ذخیره، این ثبت دیگر به حساب مشترک وصل نیست'
          : 'شریک این ثبت را در حساب مشترک تغییر داده؛ ذخیره، تغییر او را جایگزین می‌کند'}{' '}
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(list[0])}>
          دیدن تغییر
        </Button>
        {sheet}
      </div>
    )
  }

  return (
    <>
      {list.map(notice => (
        <Card key={notice.id} className={guideCardClass} role="note">
          <span className={guideCardIconClass} aria-hidden="true">
            <AppIcon name="bell" size={20} />
          </span>
          <span className={guideCardTextClass}>
            <span className={guideCardTitleClass}>
              {noticeSentence(notice, nameOf(notice.by))}
              {notice.kind === 'edit'
                ? `: از ${noticeValue(notice, notice.old, nameOf)} به ${noticeValue(
                    notice,
                    notice.new,
                    nameOf
                  )}`
                : ''}
            </span>
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(notice)}>
            بررسی
          </Button>
        </Card>
      ))}
      {sheet}
    </>
  )
}
