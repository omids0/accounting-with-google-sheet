import { getActiveWorkspaceType } from './workspace'

/** The words of the one-page monthly report and the year card, which a building words its own way. */
export interface ReportWords {
  income: string
  expense: string
  net: string
  savings: string
  savingsRate: string
}

const PERSONAL: ReportWords = {
  income: 'درآمد',
  expense: 'هزینه',
  net: 'خالص',
  savings: 'پس‌انداز',
  savingsRate: 'نرخ پس‌انداز'
}

const BUILDING: ReportWords = {
  income: 'وصول',
  expense: 'هزینه',
  net: 'وصول − هزینه',
  savings: 'مازاد صندوق',
  savingsRate: 'نرخ مازاد'
}

/** `building` defaults to the active workspace. */
export function reportWords(building = getActiveWorkspaceType() === 'building'): ReportWords {
  return building ? BUILDING : PERSONAL
}
