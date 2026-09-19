import CategorySelect from './CategorySelect'
import { useSubcategoryList } from './categorySelect/useSubcategoryManager'
import type { CategoryType } from '../../services/categories'

interface SubCategorySelectProps {
  value: string
  onChange: (value: string) => void
  categoryType: CategoryType
  category: string
  'aria-label'?: string
  id?: string
  className?: string
  disabled?: boolean
  allOption?: { value: string; label: string }
  placeholder?: string
}

export default function SubCategorySelect({
  value,
  onChange,
  categoryType,
  category,
  'aria-label': ariaLabel = 'زیردسته',
  id,
  className,
  disabled,
  allOption,
  placeholder = 'انتخاب زیردسته'
}: SubCategorySelectProps) {
  const { subcategories, setSubcategories, persist } = useSubcategoryList(categoryType, category)

  return (
    <CategorySelect
      id={id}
      value={value}
      onChange={onChange}
      categories={subcategories}
      onCategoriesChange={setSubcategories}
      onPersist={persist}
      allowEmpty
      allowManage={allOption == null}
      manageTitle="مدیریت زیردسته‌ها"
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      allOption={allOption}
    />
  )
}
