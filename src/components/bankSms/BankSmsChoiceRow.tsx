import { useState, type RefObject } from 'react'

import { smsChoiceReason } from './smsLabels'
import type { SmsChoice } from './useBankSmsReview'
import type { useVehicleExpenseEntry } from '../../hooks/useVehicleExpenseEntry'
import { getCategoriesPath } from '../../routes/paths'
import { readCategoryList } from '../../services/categoryManage'
import { getSettings } from '../../services/settings'
import { lockedCategoriesFor } from '../../utils/protectedCategories'
import CategorySelect from '../form/CategorySelect'
import { readSubcategories } from '../form/categorySelect/useSubcategoryManager'
import FormField from '../form/FormField'
import SubCategorySelect from '../form/SubCategorySelect'
import { smsChoiceReasonClass, smsChoiceRowClass, smsHintClass } from '../ui/bankSmsStyles'
import VehicleExpenseFields from '../vehicleExpenses/VehicleExpenseFields'

type BankSmsChoiceRowProps = {
  type: 'income' | 'expense'
  choice: SmsChoice | null
  /** Shown in the «عنوان» field while it is empty: what is saved when left blank. */
  defaultTitle: string
  busy: boolean
  onPick: (choice: SmsChoice) => void
  /** The SMS amount, for the fuel litres line of a vehicle expense. */
  amount?: number
  /** Set while the category is «خودرو»: the entry form's vehicle fields replace subcategory and title. */
  vehicle?: ReturnType<typeof useVehicleExpenseEntry>
  /** Lets the card scroll to a field of the vehicle block that failed validation. */
  rootRef?: RefObject<HTMLDivElement>
}

/**
 * «دسته پیشنهادی» block: why it was suggested, then the entry form's own category and
 * subcategory pickers (so categories can be added or managed right here) and the title.
 * «خودرو» asks what the manual form asks: vehicle, expense type, fuel price and mileage.
 */
export default function BankSmsChoiceRow({
  type,
  choice,
  defaultTitle,
  busy,
  onPick,
  amount = 0,
  vehicle,
  rootRef
}: BankSmsChoiceRowProps) {
  const [categories, setCategories] = useState(() => readCategoryList(type))
  const formId = getSettings()?.forms.find(form => form.type === type)?.id
  const category = choice?.category ?? ''
  const subCategory = choice?.subCategory ?? ''
  const title = choice?.title ?? ''
  // Same rule as the entry form: a subcategory picker only when the category has some.
  const hasSubcategories = !vehicle && readSubcategories(type, category).length > 0

  return (
    <div ref={rootRef} className={smsChoiceRowClass}>
      <p className={smsChoiceReasonClass}>
        {choice ? smsChoiceReason(choice) : 'دسته‌ای پیشنهاد نشد؛ یکی را انتخاب کنید.'}
      </p>
      <CategorySelect
        value={category}
        onChange={next => onPick({ category: next, subCategory: '', title })}
        categories={categories}
        onCategoriesChange={next => {
          setCategories(next)
          // A deleted or renamed pick must not stay selected (the entry form does the same).
          if (category && !next.includes(category)) {
            onPick({ category: next[0] ?? '', subCategory: '', title })
          }
        }}
        formId={formId}
        categoryScope={type}
        lockedCategories={lockedCategoriesFor(type)}
        allowSubcategories
        fullManagePath={getCategoriesPath(type)}
        disabled={busy}
        aria-label={type === 'expense' ? 'دسته هزینه' : 'دسته درآمد'}
      />
      {hasSubcategories ? (
        <SubCategorySelect
          value={subCategory}
          onChange={next => onPick({ category, subCategory: next, title })}
          categoryType={type}
          category={category}
          disabled={busy}
        />
      ) : null}
      {vehicle?.loading ? <p className={smsHintClass}>در حال خواندن خودروها…</p> : null}
      {vehicle ? (
        <VehicleExpenseFields
          values={vehicle.vehicleValues}
          amount={amount}
          onChange={vehicle.patchVehicleValues}
          vehicles={vehicle.vehicles}
          expenseTypes={vehicle.expenseTypes}
          onExpenseTypesChange={vehicle.setExpenseTypes}
          errors={vehicle.fieldErrors}
          disabled={busy || vehicle.loading}
          renew={
            vehicle.renewableService
              ? { serviceType: vehicle.renewableService.serviceType, on: vehicle.renewing }
              : undefined
          }
        />
      ) : (
        /* Always shown, so it is clear the title can be typed; it needs a category to attach to. */
        <FormField
          label="عنوان (اختیاری)"
          hint={
            category ? 'خالی بگذارید، همان عنوان پیش‌فرض ثبت می‌شود.' : 'اول دسته را انتخاب کنید.'
          }
        >
          <input
            type="text"
            value={title}
            onChange={event => onPick({ category, subCategory, title: event.target.value })}
            placeholder={defaultTitle}
            disabled={busy || !category}
          />
        </FormField>
      )}
    </div>
  )
}
