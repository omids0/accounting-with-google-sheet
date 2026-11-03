import type { UseFormRegisterReturn } from 'react-hook-form'

import { FormField } from '../form'

/** «شماره حساب» of a bank account: digits only keyboard, never autofilled by the browser. */
export default function WalletAccountNumberField({
  registration
}: {
  registration: UseFormRegisterReturn
}) {
  return (
    <FormField label="شماره حساب" hint="اختیاری — روی کارت نمایش داده می‌شود">
      <input
        {...registration}
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        placeholder="مثلاً: 0123456789"
      />
    </FormField>
  )
}
