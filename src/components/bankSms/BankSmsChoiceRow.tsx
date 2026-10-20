import { useState } from 'react'

import { smsChoiceReason } from './smsLabels'
import type { SmsChoice } from './useBankSmsReview'
import { getCategoriesPath } from '../../routes/paths'
import { readCategoryList } from '../../services/categoryManage'
import { getSettings } from '../../services/settings'
import { getVehicleExpenseCategories } from '../../services/vehicleExpenseCategories'
import { LOCKED_VEHICLE_EXPENSE_TYPES, lockedCategoriesFor } from '../../utils/protectedCategories'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'
import CategorySelect from '../form/CategorySelect'
import FormField from '../form/FormField'
import SubCategorySelect from '../form/SubCategorySelect'
import { smsChoiceReasonClass, smsChoiceRowClass } from '../ui/bankSmsStyles'

type BankSmsChoiceRowProps = {
  type: 'income' | 'expense'
  choice: SmsChoice | null
  /** Shown in the «عنوان» field while it is empty: what is saved when left blank. */
  defaultTitle: string
  busy: boolean
  onPick: (choice: SmsChoice) => void
}

/**
 * «دسته پیشنهادی» block: why it was suggested, then the entry form's own category and
 * subcategory pickers (so categories can be added or managed right here) and the title.
 */
export default function BankSmsChoiceRow({
  type,
  choice,
  defaultTitle,
  busy,
  onPick
}: BankSmsChoiceRowProps) {
  const [categories, setCategories] = useState(() => readCategoryList(type))
  const [vehicleTypes, setVehicleTypes] = useState(() => getVehicleExpenseCategories())
  const formId = getSettings()?.forms.find(form => form.type === type)?.id
  const category = choice?.category ?? ''
  const subCategory = choice?.subCategory ?? ''
  const title = choice?.title ?? ''

  return (
    <div className={smsChoiceRowClass}>
      <p className={smsChoiceReasonClass}>
        {choice ? smsChoiceReason(choice) : 'دسته‌ای پیشنهاد نشد؛ یکی را انتخاب کنید.'}
      </p>
      <CategorySelect
        value={category}
        onChange={next => onPick({ category: next, subCategory: '', title })}
        categories={categories}
        onCategoriesChange={setCategories}
        formId={formId}
        categoryScope={type}
        lockedCategories={lockedCategoriesFor(type)}
        allowSubcategories
        fullManagePath={getCategoriesPath(type)}
        disabled={busy}
        aria-label={type === 'expense' ? 'دسته هزینه' : 'دسته درآمد'}
      />
      {category && type === 'expense' && isVehicleExpenseCategory(category) ? (
        // Same list as the entry form's «نوع هزینه»; the form opens with it already chosen.
        <CategorySelect
          value={subCategory}
          onChange={next => onPick({ category, subCategory: next, title })}
          categories={vehicleTypes}
          categoryScope="vehicleExpense"
          onCategoriesChange={setVehicleTypes}
          lockedCategories={[...LOCKED_VEHICLE_EXPENSE_TYPES]}
          disabled={busy}
          aria-label="نوع هزینه خودرو"
          placeholder="انتخاب نوع هزینه"
        />
      ) : category ? (
        <SubCategorySelect
          value={subCategory}
          onChange={next => onPick({ category, subCategory: next, title })}
          categoryType={type}
          category={category}
          disabled={busy}
        />
      ) : null}
      {/* Always shown, so it is clear the title can be typed; it needs a category to attach to. */}
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
    </div>
  )
}
