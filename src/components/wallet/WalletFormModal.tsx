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
import { CategorySelect, FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import { getDefaultBankCardColor } from './bankCardColorVariants'
import { getBankById, resolveBankInternalId } from './banks'
import { isCustomCardColor } from './customCardTheme'
import type { WalletAccountWithRow, WalletFormState } from './types'
import WalletAccountCardVisual from './WalletAccountCardVisual'
import WalletCardColorSection from './WalletCardColorSection'
import WalletCardNumberInput from './WalletCardNumberInput'
import { walletCardPreviewClass } from './walletCardStyles'
import { isValidCardNumber, resolveAccountKind } from './walletCardUtils'
import { buildWalletFormInitialValues, buildWalletPreviewAccount } from './walletFormDefaults'
import { WALLET_ACCOUNT_KIND_BANK, WALLET_ACCOUNT_KIND_CASH } from '../../services/walletCategories'

type WalletFormModalProps = {
  open: boolean
  editingAccount: WalletAccountWithRow | null
  saving: boolean
  bankCategories: string[]
  onBankCategoriesChange: (next: string[]) => void
  accountKindCategories: string[]
  onAccountKindCategoriesChange: (next: string[]) => void
  onClose: () => void
  onSubmit: (values: WalletFormState) => void | Promise<void>
}

export default function WalletFormModal({
  open,
  editingAccount,
  saving,
  bankCategories,
  onBankCategoriesChange,
  accountKindCategories,
  onAccountKindCategoriesChange,
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
  const resolvedKind = resolveAccountKind({ accountKind: watched.accountKind ?? '' })

  const previewAccount = useMemo(
    () => buildWalletPreviewAccount(watched, bankId, resolvedKind),
    [watched, bankId, resolvedKind]
  )

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  const isBankAccount = resolvedKind === 'bank'

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
            <CategorySelect
              value={field.value}
              onChange={value => {
                field.onChange(value)
                if (resolveAccountKind({ accountKind: value }) !== 'bank') {
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
              categories={accountKindCategories}
              categoryScope="walletAccountKind"
              onCategoriesChange={onAccountKindCategoriesChange}
              lockedCategories={[WALLET_ACCOUNT_KIND_BANK, WALLET_ACCOUNT_KIND_CASH]}
              invalid={Boolean(fieldState.error)}
              aria-label="نوع حساب"
              placeholder="انتخاب نوع حساب"
              manageTitle="مدیریت نوع حساب"
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
              <CategorySelect
                value={field.value}
                onChange={value => {
                  field.onChange(value)
                  const bank = getBankById(value)
                  if (bank && !watched.title?.trim()) {
                    setValue('title', bank.label)
                  }
                  if (!isCustomCardColor(watched.cardColor ?? '')) {
                    setValue('cardColor', getDefaultBankCardColor(resolveBankInternalId(value)))
                  }
                }}
                categories={bankCategories}
                categoryScope="walletBank"
                onCategoriesChange={onBankCategoriesChange}
                invalid={Boolean(fieldState.error)}
                aria-label="بانک"
                placeholder="انتخاب بانک"
                manageTitle="مدیریت بانک‌ها"
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
                      accountKind={resolvedKind}
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
