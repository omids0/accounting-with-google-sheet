import { useAmountsHidden } from '../../hooks/useAmountsHidden'
import { cn } from '../../utils/cn'
import { haptic } from '../../utils/haptics'
import AppIcon from '../AppIcon'
import { headerActionBtnClass, headerIconBtnMenuClass } from '../ui/layoutStyles'

/**
 * «حالت مخفی ارقام» eye in the header: next to ⌕ on phones and tablets
 * (`variant="mobile"`), in the toolbar row on desktop (`variant="desktop"`).
 */
export default function HeaderAmountsToggle({ variant }: { variant: 'mobile' | 'desktop' }) {
  const { hidden, toggle } = useAmountsHidden()
  const label = hidden ? 'نمایش مبلغ‌ها' : 'مخفی کردن مبلغ‌ها'

  return (
    <button
      type="button"
      className={
        variant === 'mobile'
          ? cn(headerIconBtnMenuClass(hidden), 'xl:hidden')
          : cn(headerActionBtnClass, 'hidden shrink-0 xl:inline-flex', hidden && 'bg-white/30')
      }
      onClick={() => {
        haptic('selection')
        toggle()
      }}
      aria-label="حالت مخفی ارقام"
      aria-pressed={hidden}
      title={label}
    >
      <AppIcon name={hidden ? 'eye-off' : 'eye'} size={variant === 'mobile' ? 19 : 17} />
    </button>
  )
}
