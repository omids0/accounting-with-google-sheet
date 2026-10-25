import type { HelpHintAction, HelpHintProps } from './HelpHint'
import type { Tab } from './layout/types'
import { useNavigationStore } from '../stores/navigationStore'

function goTo(label: string, tab: Tab): HelpHintAction {
  return { label, onClick: () => useNavigationStore.getState().onTabChange(tab) }
}

const MORE_IN_ABOUT = goTo('بیشتر در «درباره»', 'about')

/** Inline «؟» help for the concepts users ask about most; short forms of the About copy. */
export const HELP_HINTS = {
  netAvailable: {
    title: 'دارایی قابل اتکا',
    text: 'جمع حساب‌ها و دارایی‌هایی که خودت انتخاب کرده‌ای، منهای بدهی‌های فعال — پولی که واقعاً می‌توانی رویش حساب کنی.',
    actions: [goTo('کدام‌ها حساب شوند؟', 'net-available-settings'), MORE_IN_ABOUT]
  },
  openingBalance: {
    title: 'موجودی اول دوره',
    text: 'موجودی حساب‌ها در شروع هر ماه. ماه اول را خودت تعیین می‌کنی؛ ماه‌های بعد از مانده پایان ماه قبل ساخته می‌شوند.',
    actions: [goTo('موجودی اول دوره‌ها', 'opening-balances'), MORE_IN_ABOUT]
  },
  reconciliation: {
    title: 'تطبیق',
    text: 'وقتی جمع حساب‌های کیف پول با مانده محاسبه‌شده فرق دارد، «ردیاب اختلاف» علتش را پیدا می‌کند و اگر نشد، یک رکورد اصلاحی اختلاف را می‌بندد؛ هیچ رکورد قبلی تغییر نمی‌کند.',
    actions: [goTo('پیدا کردن علت اختلاف', 'wallet-trace'), MORE_IN_ABOUT]
  }
} satisfies Record<string, HelpHintProps>
