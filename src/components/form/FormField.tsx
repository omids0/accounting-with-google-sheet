import {
  type CSSProperties,
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode
} from 'react'

import AmountInput from '../AmountInput'
import JalaliDatePicker from '../JalaliDatePicker'
import CategorySelect from './CategorySelect'
import CounterpartySelect from './CounterpartySelect'
import { cn } from '../../utils/cn'
import { formNoteTextareaClass } from '../ui/formControlStyles'
import {
  type FormControlWidth,
  formControlClassName,
  formControlInvalidClass,
  formControlWidthCompactClass,
  formControlWidthFullClass,
  formControlWidthStandardClass,
  formErrorClass,
  formFieldClass,
  formHintClass,
  formLabelClass
} from '../ui/formStyles'

interface FormFieldProps {
  label?: string
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  id?: string
  controlWidth?: FormControlWidth
}

type ControlProps = {
  id?: string
  className?: string
  type?: string
  invalid?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

export function isNativeTextControl(element: ReactElement<ControlProps>): boolean {
  if (element.type === 'textarea') return true
  if (element.type !== 'input') return false

  const type = element.props.type
  return type !== 'checkbox' && type !== 'radio'
}

function resolveControlChild(children: ReactNode): ReactNode {
  if (isValidElement(children)) {
    return children
  }

  const items = Children.toArray(children).filter(isValidElement)

  if (items.length === 1) {
    return items[0]
  }

  return children
}

function enhanceControl(
  child: ReactNode,
  controlId: string,
  invalid: boolean,
  describedBy?: string
): ReactNode {
  if (!isValidElement(child)) {
    return child
  }

  const element = child as ReactElement<ControlProps>
  const { id, className } = element.props
  const patch: ControlProps = {}

  if (!id) {
    patch.id = controlId
  }

  if (invalid) {
    patch.invalid = true
    patch['aria-invalid'] = true
  }

  if (describedBy) {
    patch['aria-describedby'] = describedBy
  }

  if (isNativeTextControl(element)) {
    const textareaClass = element.type === 'textarea' ? formNoteTextareaClass : undefined
    patch.className = cn(
      formControlClassName(textareaClass),
      className,
      invalid && formControlInvalidClass
    )
  }

  if (Object.keys(patch).length === 0) {
    return child
  }

  return cloneElement(element, patch)
}

function resolveControlWidthClass(
  children: ReactNode,
  controlWidth: FormControlWidth = 'auto'
): string {
  if (controlWidth === 'compact') return formControlWidthCompactClass
  if (controlWidth === 'standard') return formControlWidthStandardClass
  if (controlWidth === 'full') return formControlWidthFullClass
  if (!isValidElement(children)) return formControlWidthFullClass

  const element = children as ReactElement<ControlProps>

  if (
    element.type === 'textarea' ||
    element.type === CategorySelect ||
    element.type === CounterpartySelect
  ) {
    return formControlWidthFullClass
  }

  if (element.type === AmountInput || element.type === JalaliDatePicker) {
    return formControlWidthCompactClass
  }

  if (element.type === 'input') {
    const type = element.props.type

    if (type === 'number' || type === 'tel') {
      return formControlWidthCompactClass
    }

    return formControlWidthStandardClass
  }

  return formControlWidthFullClass
}

export default function FormField({
  label,
  required = false,
  hint,
  error,
  className,
  style,
  children,
  id,
  controlWidth = 'auto'
}: FormFieldProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const errorId = `${controlId}-error`
  const invalid = Boolean(error)
  const describedBy = error ? errorId : undefined
  const controlChild = resolveControlChild(children)
  const control = enhanceControl(controlChild, controlId, invalid, describedBy)
  const controlShellClass = resolveControlWidthClass(controlChild, controlWidth)

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
      <div className={cn('form-control-shell', controlShellClass)}>{control}</div>
      {error ? (
        <p id={errorId} className={formErrorClass} role="alert">
          {error}
        </p>
      ) : hint ? (
        <div className={formHintClass}>{hint}</div>
      ) : null}
    </div>
  )
}
