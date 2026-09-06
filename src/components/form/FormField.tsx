import {
  type CSSProperties,
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
  formControlWidthCompactClass,
  formControlWidthFullClass,
  formControlWidthStandardClass,
  formFieldClass,
  formHintClass,
  formLabelClass
} from '../ui/formStyles'

interface FormFieldProps {
  label?: string
  required?: boolean
  hint?: ReactNode
  className?: string
  style?: CSSProperties
  children: ReactNode
  id?: string
  controlWidth?: FormControlWidth
}

type ControlProps = { id?: string; className?: string; type?: string }

function isNativeTextControl(element: ReactElement<ControlProps>): boolean {
  if (element.type === 'textarea') return true
  if (element.type !== 'input') return false

  const type = element.props.type
  return type !== 'checkbox' && type !== 'radio'
}

function enhanceControl(child: ReactNode, controlId: string): ReactNode {
  if (!isValidElement(child)) {
    return child
  }

  const element = child as ReactElement<ControlProps>
  const { id, className } = element.props
  const patch: ControlProps = {}

  if (!id) {
    patch.id = controlId
  }

  if (isNativeTextControl(element)) {
    const textareaClass = element.type === 'textarea' ? formNoteTextareaClass : undefined
    patch.className = cn(formControlClassName(textareaClass), className)
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
  className,
  style,
  children,
  id,
  controlWidth = 'auto'
}: FormFieldProps) {
  const autoId = useId()
  const controlId = id ?? autoId
  const control = enhanceControl(children, controlId)
  const controlShellClass = resolveControlWidthClass(children, controlWidth)

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
      {hint && <div className={formHintClass}>{hint}</div>}
    </div>
  )
}
