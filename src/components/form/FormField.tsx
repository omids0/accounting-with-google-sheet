import type { ReactNode } from 'react';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label,
  required = false,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={['form-field', 'form-group', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="form-field-label">
          <span className="form-field-label-text">{label}</span>
          {required && <span className="required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="form-field-control">{children}</div>
      {hint && <div className="form-field-hint">{hint}</div>}
    </div>
  );
}
