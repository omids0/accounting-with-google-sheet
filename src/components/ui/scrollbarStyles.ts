import { cn } from '../../utils/cn'

/** Fully hide native scrollbars while keeping scroll behavior. */
export const scrollbarHiddenClass = cn(
  '[-ms-overflow-style:none] [scrollbar-width:none]',
  '[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0',
  '[&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:size-0',
  '[&::-webkit-scrollbar-thumb]:hidden [&::-webkit-scrollbar-track]:hidden'
)

/** Marks scroll containers that use the custom app scrollbar skin. */
export const appScrollbarClass = 'app-scrollbar'
