import { BUILDING_RETURN_LABEL } from './navMenuGroups'
import AppIcon from '../AppIcon'
import { appMenuItemIconClass, appMenuItemLabelClass, appMenuReturnClass } from '../ui/layoutStyles'

/** «برگشت به حساب شخصی»: the first drawer row inside a building or the shared account. */
export default function LayoutMenuReturnRow({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={appMenuReturnClass} onClick={onClick}>
      <span className={appMenuItemIconClass(false)}>
        <AppIcon name="return" size={20} />
      </span>
      <span className={appMenuItemLabelClass}>{BUILDING_RETURN_LABEL}</span>
    </button>
  )
}
