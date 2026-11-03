import type { TrailLine } from './trailText'

/**
 * «مبلغ: ۸۰۰٬۰۰۰ ← ۸۵۰٬۰۰۰». Numbers and dates sit in <bdi> so the Persian line around them
 * cannot reorder them; the arrow points from the old value to the new one in right-to-left text.
 */
export default function TrailChanges({ lines }: { lines: TrailLine[] }) {
  if (!lines.length) return null

  return (
    <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0 text-[0.76rem] leading-relaxed text-muted">
      {lines.map(line => (
        <li key={line.id} className="[overflow-wrap:anywhere]">
          <span className="font-semibold text-text">{line.label}: </span>
          <span className="sr-only">از </span>
          <bdi>{line.from}</bdi>
          <span aria-hidden="true"> ← </span>
          <span className="sr-only"> به </span>
          <bdi>{line.to}</bdi>
        </li>
      ))}
    </ul>
  )
}
