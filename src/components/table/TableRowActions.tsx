import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'

/** A row's edit / delete (and optional details) buttons — the same ones its card shows. */
export default function TableRowActions({
  onEdit,
  onDelete,
  expanded,
  onToggleExpand,
  expandLabel = 'نمایش جزئیات',
  itemLabel
}: {
  /** The row's name, e.g. «چک ۱۲۳»; the buttons read «ویرایش چک ۱۲۳». */
  itemLabel: string
  onEdit?: () => void
  onDelete?: () => void
  expanded?: boolean
  onToggleExpand?: () => void
  expandLabel?: string
}) {
  return (
    <>
      {onEdit && <CardEditButton itemLabel={itemLabel} onClick={onEdit} />}
      {onDelete && <CardDeleteButton itemLabel={itemLabel} onClick={onDelete} />}
      {onToggleExpand && (
        <CardExpandButton
          itemLabel={itemLabel}
          expanded={!!expanded}
          onClick={onToggleExpand}
          label={expanded ? 'بستن جزئیات' : expandLabel}
        />
      )}
    </>
  )
}
