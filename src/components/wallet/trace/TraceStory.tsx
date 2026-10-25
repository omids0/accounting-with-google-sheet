import { useNavigate } from 'react-router'

import { maskAmountsInText } from './traceMask'
import { useIsAmountsHidden } from '../../../hooks/useAmountsHidden'
import { getPathForTab } from '../../../routes/paths'
import { ACTIVITY_MODULE_LABELS, type ActivityModule } from '../../../services/activityLogText'
import type { TraceEvent, TraceStory } from '../../../services/walletTraceTypes'
import { cn } from '../../../utils/cn'
import { formatJalaliMonthLabel } from '../../../utils/dateRange'
import { formatPersianNumber } from '../../../utils/formatMoney'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'

const textClass = 'm-0 max-w-prose leading-[1.9] text-muted'
const strongTextClass = cn(textClass, 'font-semibold text-text')

/** Deleting these also deletes the income/expense records they made. */
const CARRIER_MODULES = new Set(['receivables', 'installments', 'dang', 'checks', 'goals'])

const ACTION_VERBS: Record<string, string> = {
  create: 'ثبت شد',
  update: 'ویرایش شد',
  delete: 'حذف شد',
  pay: 'پرداخت شد',
  unpay: 'پرداختش برگشت'
}

const whenLabel = (ms: number) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit'
  }).format(ms)

/** An amount with its unit, kept on one line. */
function Amount({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap">
      <MoneyText amount={value} />
    </span>
  )
}

function Headline({ story }: { story: TraceStory }) {
  const gap = Math.abs(story.change)
  const sameSize = story.exact
    ? 'مبلغ این تغییر با اختلاف فعلی دقیقاً برابر است.'
    : 'این تغییر فقط بخشی از اختلاف است؛ بقیه از جای دیگری آمده.'

  if (story.kind === 'opening-shift' && story.monthKey) {
    const lower = (story.openingTo ?? 0) < (story.openingFrom ?? 0)

    return (
      <>
        <p className={textClass}>
          اختلاف از {whenLabel(story.toAt)} شروع شد. در همان لحظه «موجودی اول{' '}
          {formatJalaliMonthLabel(story.monthKey)}» (پولی که طبق رکوردها از ماه‌های قبل مانده بود)
          از <Amount value={story.openingFrom ?? 0} /> به <Amount value={story.openingTo ?? 0} />{' '}
          رسید، یعنی <Amount value={gap} /> {lower ? 'کمتر' : 'بیشتر'}.{' '}
          {lower
            ? 'یعنی رکوردهایی که این پول را نشان می‌دادند کم یا پاک شدند، ولی پول حساب‌ها کم نشد.'
            : 'یعنی رکوردهایی اضافه شدند که پولشان وارد حساب‌ها نشده.'}
        </p>
        <p className={strongTextClass}>{sameSize}</p>
      </>
    )
  }

  return (
    <>
      <p className={textClass}>
        از آخرین باری که این صفحه را دیدی ({whenLabel(story.fromAt)}) تا {whenLabel(story.toAt)}،
        اختلاف <Amount value={gap} /> {story.change > 0 ? 'بیشتر' : 'کمتر'} شد.
      </p>
      <p className={strongTextClass}>{sameSize}</p>
    </>
  )
}

function EventRow({ event }: { event: TraceEvent }) {
  const hidden = useIsAmountsHidden()
  const title = event.summary.match(/«([^»]*)»/)?.[1] ?? event.summary
  const module = ACTIVITY_MODULE_LABELS[event.module as ActivityModule] ?? event.module

  return (
    <li className="flex flex-col gap-0.5 border-t border-border py-1.5 first:border-t-0">
      <span className={cn('font-semibold', event.action === 'delete' && 'text-danger')}>
        {ACTION_VERBS[event.action] ?? event.action}: {maskAmountsInText(title, hidden)}
      </span>
      <span className="text-[0.78rem] text-muted">
        {module} · {whenLabel(event.at)}
      </span>
    </li>
  )
}

/** Why a deletion leaves a gap, and the two safe ways out. */
function DeletionAdvice({ difference }: { difference: number }) {
  const closing = `ثبت ${difference > 0 ? 'درآمد' : 'هزینه'} اصلاح موجودی`

  return (
    <div className="flex flex-col gap-2">
      <p className={textClass}>
        <strong className="text-text">چرا اختلاف شد؟</strong> وقتی یک طلب، قسط، بدهی یا چک را پاک
        می‌کنی، درآمد و هزینه‌هایی که از پرداخت‌هایش ثبت شده بود هم پاک می‌شوند. ولی اگر پولش واقعاً
        به حساب‌هایت رسیده بود، هنوز در حساب‌هاست. پس رکوردها کم شدند و حساب‌ها نه.
      </p>
      <p className={textClass}>
        <strong className="text-text">چه کنم؟</strong>
      </p>
      <ol className={cn(textClass, 'list-decimal ps-5')}>
        <li>
          اشتباهی پاک شد: دوباره ثبتش کن و پرداخت‌هایش را هم ثبت کن، ولی «اثر بر موجودی» را «خیر»
          بگذار تا پول حساب‌ها دوباره زیاد نشود.
        </li>
        <li>عمداً پاک کردی: پایین همین صفحه «{closing}» را بزن.</li>
      </ol>
      <p className={textClass}>
        مبلغ موردهای پاک‌شده در گزارش نیست؛ اگر جمع پرداخت‌هایشان با این مبلغ نمی‌خواند، علت چیز
        دیگری هم هست.
      </p>
    </div>
  )
}

function NoEvents({ story }: { story: TraceStory }) {
  return (
    <p className={textClass}>
      {story.logGap
        ? 'فعالیت‌های آن موقع دیگر در اپ نمانده، پس نمی‌شود گفت چه کاری انجام شده بود.'
        : 'در «فعالیت‌ها» کاری در این فاصله پیدا نشد؛ شاید تغییر از گوشی یا رایانهٔ دیگری آمده باشد، ساعت دستگاه‌ها فرق داشته باشد، یا جدول گوگل مستقیم ویرایش شده باشد.'}
    </p>
  )
}

/**
 * «اختلاف از کجا آمد؟»: the moment the difference moved and what was done in the app meanwhile.
 * It is the only part that sees things that no longer exist, like a deleted receivable.
 */
export default function TraceStoryCard({
  story,
  difference
}: {
  story: TraceStory
  difference: number
}) {
  const navigate = useNavigate()
  const deleted = story.events.some(
    event => event.action === 'delete' && CARRIER_MODULES.has(event.module)
  )

  return (
    <Card className="mb-0 flex flex-col gap-2 text-[0.82rem]">
      <CardTitle className="mb-0">اختلاف از کجا آمد؟</CardTitle>
      <Headline story={story} />
      {story.events.length ? (
        <>
          <p className={textClass}>همان دقیقه‌ها در اپ این کارها انجام شد:</p>
          <ul className="m-0 flex max-w-prose list-none flex-col p-0">
            {story.events.map((event, index) => (
              <EventRow key={`${event.at}-${index}`} event={event} />
            ))}
          </ul>
          {story.omitted ? (
            <p className={textClass}>و {formatPersianNumber(story.omitted)} کار دیگر.</p>
          ) : null}
        </>
      ) : (
        <NoEvents story={story} />
      )}
      {deleted ? (
        <DeletionAdvice difference={difference} />
      ) : (
        <p className={textClass}>
          کارهای بالا را نگاه کن؛ اگر یکی‌شان اشتباه بود درستش کن، و اگر نه، اختلاف را پایین صفحه
          ببند.
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 self-start"
        onClick={() => navigate(getPathForTab('activity'))}
      >
        دیدن همهٔ فعالیت‌ها
      </Button>
    </Card>
  )
}
