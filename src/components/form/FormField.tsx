import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode
} from 'react'

interface FormFieldProps {
  label?: string
  required?: boolean
  hint?: ReactNode
  className?: string
  style?: CSSProperties
  children: ReactNode
  id?: string
}

function assignControlId(child: ReactNode, controlId: string): ReactNode {
  if (!isValidElement(child)) {
    return child
  }

  const props = child.props as { id?: string }

  if (props.id) {
    return child
  }

  return cloneElement(child as ReactElement<{ id?: string }>, { id: controlId })
}

export default function FormField({
  label,
  required = false,
  hint,
  className,
  style,
  children,
  id
}: FormFieldProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const control = assignControlId(children, controlId)

  return (
    <div
      className={['form-field', 'form-group', className].filter(Boolean).join(' ')}
      style={style}
    >
      {label && (
        <label className="form-field-label" htmlFor={controlId}>
          <span className="form-field-label-text">{label}</span>
          {required && (
            <span className="required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="form-field-control">{control}</div>
      {hint && <div className="form-field-hint">{hint}</div>}
    </div>
  )
}
