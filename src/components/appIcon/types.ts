export type AppIconName =
  | 'installments'
  | 'debt'
  | 'checks'
  | 'dashboard'
  | 'receivables'
  | 'treasury'
  | 'wallet'
  | 'counterparties'
  | 'records'
  | 'search'
  | 'filter'
  | 'empty-inbox'
  | 'edit'
  | 'folder'
  | 'contact'
  | 'warning'
  | 'back'
  | 'menu'
  | 'grip'
  | 'settings'
  | 'close'
  | 'check'
  | 'x-mark'
  | 'add'
  | 'refresh'
  | 'import'
  | 'export'
  | 'pdf'
  | 'trash'
  | 'calculator'
  | 'chart'
  | 'chevron-down'
  | 'swap'
  | 'lock'
  | 'fingerprint'
  | 'clock'
  | 'bell'
  | 'info'

export interface AppIconProps {
  name: AppIconName
  size?: number
  className?: string
  strokeWidth?: number
}

export type IconSvgProps = {
  width: number
  height: number
  strokeWidth: number
  className?: string
}
