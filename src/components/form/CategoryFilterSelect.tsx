import CategorySelect from './CategorySelect'

const ALL_OPTION = { value: 'all', label: 'همه' }

interface CategoryFilterSelectProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  'aria-label'?: string
  className?: string
}

export default function CategoryFilterSelect({
  value,
  onChange,
  categories,
  'aria-label': ariaLabel = 'دسته‌بندی',
  className
}: CategoryFilterSelectProps) {
  return (
    <CategorySelect
      value={value}
      onChange={onChange}
      categories={categories}
      allOption={ALL_OPTION}
      allowManage={false}
      showSearchAlways
      placeholder="همه"
      aria-label={ariaLabel}
      className={className}
    />
  )
}
