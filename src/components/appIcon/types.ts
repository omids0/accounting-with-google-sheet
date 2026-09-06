export type AppIconName =
  | 'installments'
  | 'debt'
  | 'checks'
  | 'dashboard'
  | 'receivables'
  | 'treasury'
  | 'wallet'
  | 'records'
  | 'search'
  | 'filter'
  | 'empty-inbox'
  | 'edit'
  | 'folder'
  | 'warning'
  | 'back'
  | 'menu'
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
