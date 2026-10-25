import { useState } from 'react'

import TraceFindingRow from './TraceFindingRow'
import { TRACE_SECTION_LIMIT } from './traceKinds'
import type { TraceFinding } from '../../../services/walletTraceTypes'
import { formatPersianNumber } from '../../../utils/formatMoney'
import CalmBlock from '../../CalmBlock'
import MoneyText from '../../MoneyText'
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
  const [all, setAll] = useState(false)

  if (!findings.length && !emptyText) return null

  const shown = all ? findings : findings.slice(0, TRACE_SECTION_LIMIT)
  const total = findings.reduce((sum, item) => sum + item.effect, 0)

  return (
    <CalmBlock
      title={title}
      badge={findings.length ? <MoneyText amount={total} signed="plus" /> : undefined}
      action={
        findings.length > TRACE_SECTION_LIMIT
          ? {
              label: all ? 'کمتر' : `همه (${formatPersianNumber(findings.length)})`,
              onClick: () => setAll(value => !value)
            }
          : undefined
      }
    >
      {findings.length ? (
        <ul className={calmListClass}>
          {shown.map(item => (
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
        title="مظنون‌ها"
        note="اگر مورد درست است «تأیید کردم» را بزن؛ اختلاف عوض نمی‌شود ولی از فهرست مظنون‌ها بیرون می‌رود. اگر اشتباه است، رکورد را درست کن."
        findings={suspects}
        emptyText={known.length || confirmed.length ? 'مورد مشکوکی نمانده' : undefined}
        {...shared}
      />
      <Section
        title="توضیح‌شده، بدون اشتباه"
        note="این‌ها کار عمدی یا اصلاح قبلی‌اند که فرمول مانده نمی‌بیند؛ اشتباه نیستند ولی اختلاف را می‌سازند."
        findings={known}
        {...shared}
      />
      <Section title="تأییدشده" note="این‌ها را درست دانسته‌ای." findings={confirmed} {...shared} />
    </>
  )
}
