import type { DangWithRow } from './types'
import { dangPayLabel } from '../../services/buildingDang'
import Button from '../ui/Button'

/**
 * A building debt's way to be settled, in plain words: a button «پرداخت به <نام>» on an open row
 * (it opens the settle sheet) and «لغو پرداخت» on a paid one. The tiny checkbox of the personal
 * list is not shown in a building.
 */
export default function DangSettleAction({
  item,
  busy,
  onToggle
}: {
  item: DangWithRow
  busy: boolean
  onToggle: (item: DangWithRow, paid: boolean) => void
}) {
  return item.paid ? (
    <Button
      variant="secondary"
      size="sm"
      className="mt-2 min-h-11"
      disabled={busy}
      onClick={() => onToggle(item, false)}
    >
      لغو پرداخت
    </Button>
  ) : (
    <Button
      size="sm"
      className="mt-2 min-h-11 w-full"
      loading={busy}
      disabled={busy}
      onClick={() => onToggle(item, true)}
    >
      {dangPayLabel(item.counterparty)}
    </Button>
  )
}
