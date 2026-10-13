import type { CellDiff } from '../../services/rowConflict'
import { conflictDiffClass, conflictDiffHeadClass } from '../ui/conflictStyles'

/** «هر دو را ببین»: every cell that differs, theirs beside mine. */
export default function ConflictDiff({
  diffs,
  theirName
}: {
  diffs: CellDiff[]
  theirName: string
}) {
  if (!diffs.length) return <p className={conflictDiffHeadClass}>تفاوتی در ستون‌ها نیست.</p>

  return (
    <table className={conflictDiffClass}>
      <thead>
        <tr>
          <th scope="col">ستون</th>
          <th scope="col">{`نسخهٔ ${theirName}`}</th>
          <th scope="col">نسخهٔ من</th>
        </tr>
      </thead>
      <tbody>
        {diffs.map(diff => (
          <tr key={diff.label}>
            <th scope="row">{diff.label}</th>
            <td>{diff.theirs || '—'}</td>
            <td>{diff.mine || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
