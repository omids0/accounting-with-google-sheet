import AppIcon from '../AppIcon'
import { categorySelectDragHandleClass } from './formControlStyles'

interface DragReorderHandleProps {
  label: string
  disabled?: boolean
  draggable?: boolean
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void
  onDragEnd?: () => void
}

export default function DragReorderHandle({
  label,
  disabled = false,
  draggable = false,
  onDragStart,
  onDragEnd
}: DragReorderHandleProps) {
  return (
    <button
      type="button"
      className={categorySelectDragHandleClass}
      aria-label={label}
      disabled={disabled}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <AppIcon name="grip" size={16} strokeWidth={2} />
    </button>
  )
}
