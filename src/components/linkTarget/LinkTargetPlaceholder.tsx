import FormField from '../form/FormField'
import Select from '../form/Select'

const READING = [{ value: '', label: 'در حال خواندن…' }]

const noop = () => undefined

/**
 * The picker's own fields, empty and disabled, shown while its chunk loads. They take exactly the
 * room the loaded field takes (one select, two for an installment book), so the card below does
 * not jump down when the picker appears. It is a fragment, like the real field: wrapped in an
 * element, the last field would lose its bottom margin (last:mb-0) and the card would still move.
 */
export default function LinkTargetPlaceholder({
  label,
  childLabel,
  hint
}: {
  label: string
  childLabel?: string
  /** The «nothing open» text, when the last read of this kind found nothing. */
  hint?: string
}) {
  return (
    <>
      <FormField label={label} controlWidth="full" hint={hint}>
        <Select value="" onChange={noop} options={READING} disabled />
      </FormField>
      {childLabel ? (
        <FormField label={childLabel} controlWidth="full">
          <Select value="" onChange={noop} options={READING} disabled />
        </FormField>
      ) : null}
    </>
  )
}
