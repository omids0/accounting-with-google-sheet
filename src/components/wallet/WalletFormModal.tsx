import { useMemo, type FormEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import {
  formFieldError,
  requiredField,
  requiredNonNegativeAmount,
  submitValidatedForm
} from '../../utils/formValidation'
import AmountInput from '../AmountInput'
import { FormField, FormRow, Select } from '../form'
import FormModal from '../FormModal'
import { getDefaultBankCardColor } from './bankCardColorVariants'
import { getBankById, getBankSelectOptions, WALLET_ACCOUNT_KIND_OPTIONS } from './banks'
import { isCustomCardColor } from './customCardTheme'
import type { WalletAccountWithRow, WalletFormState } from './types'
import WalletAccountCardVisual from './WalletAccountCardVisual'
import WalletCardColorSection from './WalletCardColorSection'
import WalletCardNumberInput from './WalletCardNumberInput'
import { walletCardPreviewClass } from './walletCardStyles'
import { isValidCardNumber } from './walletCardUtils'
import { buildWalletFormInitialValues, buildWalletPreviewAccount } from './walletFormDefaults'

type WalletFormModalProps = {
  open: boolean
  editingAccount: WalletAccountWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: WalletFormState) => void | Promise<void>
}

export default function WalletFormModal({
  open,
  editingAccount,
  saving,
  onClose,
  onSubmit
}: WalletFormModalProps) {
  const initialValues = useMemo(
    () => buildWalletFormInitialValues(editingAccount),
    [editingAccount]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<WalletFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingAccount?.id ?? 'create'
  })

  const watched = useWatch({ control })
  const bankId = watched.bankId ?? ''
  const accountKind = watched.accountKind ?? 'other'

  const previewAccount = useMemo(
    () => buildWalletPreviewAccount(watched, bankId, accountKind),
    [watched, bankId, accountKind]
  )

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  const isBankAccount = accountKind === 'bank'

  return (
    <FormModal
      open={open}
      title={editingAccount ? 'ویرایش حساب' : 'حساب جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingAccount ? 'ذخیره تغییرات' : 'ذخیره حساب'}
    >
      <FormField label="نوع حساب" required controlWidth="full">
        <Controller
          name="accountKind"
          control={control}
          rules={requiredField('نوع حساب')}
          render={({ field, fieldState }) => (
            <Select
              value={field.value}
              onChange={value => {
                field.onChange(value)
                if (value !== 'bank') {
                  setValue('bankId', '')
                  setValue('cardNumber', '')
                  setValue('cardHolder', '')
                  setValue('iban', '')
                  setValue('accountNumber', '')
                  if (!isCustomCardColor(watched.cardColor ?? '')) {
                    setValue('cardColor', '')
                  }
                }
              }}
              options={WALLET_ACCOUNT_KIND_OPTIONS}
              invalid={Boolean(fieldState.error)}
              aria-label="نوع حساب"
            />
          )}
        />
      </FormField>

      {isBankAccount && (
        <FormField
          label="بانک"
          required
          error={formFieldError(errors, 'bankId')}
          controlWidth="full"
        >
          <Controller
            name="bankId"
            control={control}
            rules={requiredField('بانک را انتخاب کنید')}
            render={({ field, fieldState }) => (
              <Select
                value={field.value}
                onChange={value => {
                  field.onChange(value)
                  const bank = getBankById(value)
                  if (bank && !watched.title?.trim()) {
                    setValue('title', bank.label)
                  }
                  if (!isCustomCardColor(watched.cardColor ?? '')) {
                    setValue('cardColor', getDefaultBankCardColor(value))
                  }
                }}
                options={getBankSelectOptions()}
                invalid={Boolean(fieldState.error)}
                aria-label="بانک"
              />
            )}
          />
        </FormField>
      )}

      <div className={walletCardPreviewClass}>
        <WalletAccountCardVisual account={previewAccount} />
      </div>

      <FormField controlWidth="full">
        <Controller
          name="cardColor"
          control={control}
          render={({ field: cardColorField }) => (
            <Controller
              name="cardColorPrimary"
              control={control}
              render={({ field: primaryField }) => (
                <Controller
                  name="cardColorSecondary"
                  control={control}
                  render={({ field: secondaryField }) => (
                    <WalletCardColorSection
                      accountKind={accountKind}
                      bankId={bankId}
                      cardColor={cardColorField.value}
                      cardColorPrimary={primaryField.value}
                      cardColorSecondary={secondaryField.value}
                      onCardColorChange={cardColorField.onChange}
                      onPrimaryChange={primaryField.onChange}
                      onSecondaryChange={secondaryField.onChange}
                      disabled={saving}
                    />
                  )}
                />
              )}
            />
          )}
        />
      </FormField>

      <FormRow>
        <FormField label="عنوان" required error={formFieldError(errors, 'title')}>
          <input
            {...register('title', requiredField('عنوان'))}
            placeholder={isBankAccount ? 'مثلاً: حساب اصلی' : 'مثلاً: نقدی، صندوق، ...'}
          />
        </FormField>

        <Controller
          name="balance"
          control={control}
          rules={requiredNonNegativeAmount('موجودی را وارد کنید')}
          render={({ field, fieldState }) => (
            <FormField label="موجودی" required error={fieldState.error?.message}>
              <AmountInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />
      </FormRow>

      {isBankAccount && (
        <FormRow>
          <Controller
            name="cardNumber"
            control={control}
            rules={{
              required: 'شماره کارت ۱۶ رقمی را وارد کنید',
              validate: value => isValidCardNumber(value) || 'شماره کارت باید ۱۶ رقم باشد'
            }}
            render={({ field, fieldState }) => (
              <FormField label="شماره کارت" required error={fieldState.error?.message}>
                <WalletCardNumberInput
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                />
              </FormField>
            )}
          />

          <FormField label="نام دارنده کارت" hint="اختیاری — روی کارت نمایش داده می‌شود">
            <input {...register('cardHolder')} placeholder="مثلاً: علی محمدی" />
          </FormField>
        </FormRow>
      )}

      {isBankAccount && (
        <FormRow>
          <FormField label="شماره حساب" hint="اختیاری — روی کارت نمایش داده می‌شود">
            <input {...register('accountNumber')} dir="ltr" placeholder="مثلاً: 0123456789" />
          </FormField>

          <FormField label="شماره شبا" hint="اختیاری — روی کارت نمایش داده می‌شود">
            <input {...register('iban')} dir="ltr" placeholder="مثلاً: IR12 3456 7890..." />
          </FormField>
        </FormRow>
      )}

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
