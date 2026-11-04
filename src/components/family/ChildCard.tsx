import { CHILD_NO_ACCESS_BADGE, childNoAccessMessage } from '../../services/childAccessLost'
import type { ChildRecord } from '../../services/childrenRegistry'
import Alert from '../ui/Alert'
import {
  buildingCardClass,
  buildingCardHeadClass,
  buildingCardTitleClass,
  buildingChipToneClass,
  journeyRowMetaClass
} from '../ui/buildingStyles'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface ChildCardProps {
  child: ChildRecord
  /** Google no longer lets this device open the file (the child removed the share). */
  lost: boolean
  opening: boolean
  onOpen: () => void
  onReconnect: () => void
  onRename: () => void
  onForget: () => void
}

/**
 * One child on «فرزندان من»: the name, «فقط‌خواندنی» (or «دسترسی قطع شد» when access is lost), then
 * «مشاهده» (or «اتصال دوباره» when it is), «تغییر نام» and «حذف از فهرست».
 */
export default function ChildCard({
  child,
  lost,
  opening,
  onOpen,
  onReconnect,
  onRename,
  onForget
}: ChildCardProps) {
  return (
    <Card className={buildingCardClass}>
      <div className={buildingCardHeadClass}>
        <div className="min-w-0 flex-1">
          <h2 className={buildingCardTitleClass}>{child.name}</h2>
          {lost ? null : (
            <p className={journeyRowMetaClass}>فقط می‌بینید و چیزی را تغییر نمی‌دهید</p>
          )}
        </div>
        <span
          className={`${
            lost ? buildingChipToneClass.danger : buildingChipToneClass.neutral
          } shrink-0 whitespace-nowrap`}
        >
          {lost ? CHILD_NO_ACCESS_BADGE : 'فقط‌خواندنی'}
        </span>
      </div>

      {lost ? <Alert variant="warning">{childNoAccessMessage(child.name)}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        {lost ? (
          <Button type="button" size="sm" className="min-h-11" onClick={onReconnect}>
            اتصال دوباره
          </Button>
        ) : (
          <Button type="button" size="sm" className="min-h-11" loading={opening} onClick={onOpen}>
            مشاهده
          </Button>
        )}
        <Button type="button" size="sm" className="min-h-11" variant="secondary" onClick={onRename}>
          تغییر نام
        </Button>
        <Button type="button" size="sm" className="min-h-11" variant="secondary" onClick={onForget}>
          حذف از فهرست
        </Button>
      </div>
    </Card>
  )
}
