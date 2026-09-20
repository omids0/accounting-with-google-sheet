import FormField from './FormField'
import SubCategorySelect from './SubCategorySelect'
import type { CategoryType } from '../../services/categories'

interface PaymentSubCategoryFieldProps {
  value: string
  onChange: (value: string) => void
  /** The record type the payment ends up in: expense for debts, income for receivables. */
  categoryType: CategoryType
  /** Category of the generated record, which the subcategories hang off. */
  category: string
  ariaLabel: string
  label?: string
}

/**
 * Subcategory of the income or expense record a payment creates. Chosen on the
 * item itself so marking it paid stays a single tap.
 */
export default function PaymentSubCategoryField({
  value,
  onChange,
  categoryType,
  category,
  ariaLabel,
  label = 'زیردسته'
}: PaymentSubCategoryFieldProps) {
  if (!category.trim()) return null

  return (
    <FormField label={label} controlWidth="full">
      <SubCategorySelect
        value={value}
        onChange={onChange}
        categoryType={categoryType}
        category={category}
        aria-label={ariaLabel}
      />
    </FormField>
  )
}
