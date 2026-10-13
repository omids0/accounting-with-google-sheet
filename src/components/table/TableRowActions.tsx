import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'

/** A row's edit / delete (and optional details) buttons — the same ones its card shows. */
export default function TableRowActions({
  onEdit,
  onDelete,
  expanded,
  onToggleExpand,
  expandLabel = 'نمایش جزئیات'
}: {
  onEdit?: () => void
  onDelete?: () => void
  expanded?: boolean
  onToggleExpand?: () => void
  expandLabel?: string
}) {
  return (
    <>
      {onEdit && <CardEditButton onClick={onEdit} />}
      {onDelete && <CardDeleteButton onClick={onDelete} />}
      {onToggleExpand && (
        <CardExpandButton
          expanded={!!expanded}
          onClick={onToggleExpand}
          ariaLabel={expanded ? 'بستن جزئیات' : expandLabel}
        />
      )}
    </>
  )
}
