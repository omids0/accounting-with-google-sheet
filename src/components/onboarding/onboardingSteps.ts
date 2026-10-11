import type { OnboardingStepId } from '../../services/onboarding'

export const ONBOARDING_STEP_TITLES: Record<OnboardingStepId, string> = {
  wallet: 'حساب کیف پول',
  accounts: 'حساب‌های بیشتر',
  entry: 'اولین تراکنش',
  sms: 'پیامک بانکی'
}

/** Content step components report whether "continue" is allowed through this callback. */
export interface OnboardingStepProps {
  spreadsheetId: string
  onReadyChange: (ready: boolean) => void
}
