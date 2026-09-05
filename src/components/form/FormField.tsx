import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode
} from 'react'

import { cn } from '../../utils/cn'
import { formFieldClass, formHintClass, formLabelClass } from '../ui/formStyles'

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
    <div className={cn(formFieldClass, className)} style={style}>
      {label && (
        <label className={formLabelClass} htmlFor={controlId}>
          <span>{label}</span>
          {required && (
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <div>{control}</div>
      {hint && <div className={formHintClass}>{hint}</div>}
    </div>
  )
}
