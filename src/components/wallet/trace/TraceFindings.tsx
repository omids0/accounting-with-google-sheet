import TraceFindingRow from './TraceFindingRow'
import { TRACE_SECTION_LIMIT } from './traceKinds'
import { useIncrementalList } from '../../../hooks/useIncrementalList'
import type { TraceFinding } from '../../../services/walletTraceTypes'
import { listCountLabel } from '../../../utils/listCountLabel'
import CalmBlock from '../../CalmBlock'
import ShowMoreFooter from '../../ShowMoreFooter'
import { calmEmptyClass, calmListClass, calmNoteClass } from '../../ui/calmListStyles'

interface SectionProps {
  title: string
  note: string
  findings: TraceFinding[]
  acked: Set<string>
  onToggleAck: (id: string) => void
  /** Shown when the section has nothing in it; the section is hidden when omitted. */
  emptyText?: string
}

function Section({ title, note, findings, acked, onToggleAck, emptyText }: SectionProps) {
  // A user who never picks accounts can have hundreds of rows: render them in steps.
  const { visible, remaining, nextStep, showMore } = useIncrementalList(findings, {
    pageSize: TRACE_SECTION_LIMIT,
    getId: item => item.id
  })

  if (!findings.length && !emptyText) return null

  return (
    <CalmBlock title={title}>
      {findings.length ? (
        <ul className={calmListClass}>
          {visible.map(item => (
            <TraceFindingRow
              key={item.id}
              finding={item}
              acked={acked.has(item.id)}
              onToggleAck={onToggleAck}
            />
          ))}
        </ul>
      ) : (
        <p className={calmEmptyClass}>{emptyText}</p>
      )}
      <ShowMoreFooter
        remaining={remaining}
        nextStep={nextStep}
        onShowMore={showMore}
        unit="مورد"
        countLabel={listCountLabel(visible.length, findings.length, 'مورد')}
      />
      {findings.length ? <p className={calmNoteClass}>{note}</p> : null}
    </CalmBlock>
  )
}

interface TraceFindingsProps {
  findings: TraceFinding[]
  acked: Set<string>
  onToggleAck: (id: string) => void
}

/** Suspects first, then the deliberate moves the formula cannot see, then what was confirmed. */
export default function TraceFindings({ findings, acked, onToggleAck }: TraceFindingsProps) {
  const suspects = findings.filter(item => item.group === 'suspect' && !acked.has(item.id))
  const known = findings.filter(item => item.group === 'known')
  const confirmed = findings.filter(item => item.group === 'suspect' && acked.has(item.id))
  const shared = { acked, onToggleAck }

  return (
    <>
      <Section
        title="اول این‌ها را نگاه کن"
        note="اگر اشتباه است، رکورد را درست کن. اگر درست است «تأیید کردم» را بزن؛ مقدار اختلاف عوض نمی‌شود، فقط این مورد به پایین صفحه می‌رود و روی همین دستگاه یادآوری می‌شود."
        findings={suspects}
        emptyText={known.length || confirmed.length ? 'موردی برای بررسی نمانده' : undefined}
        {...shared}
      />
      <Section
        title="کار عمدی، اشتباه نیست"
        note="مثل واریز به هدف پس‌انداز یا اصلاح‌های قبلی. فرمول مانده این‌ها را نمی‌بیند، برای همین به اختلاف اضافه می‌شوند."
        findings={known}
        {...shared}
      />
      <Section
        title="تأییدشده توسط تو"
        note="این‌ها را درست دانسته‌ای."
        findings={confirmed}
        {...shared}
      />
    </>
  )
}
