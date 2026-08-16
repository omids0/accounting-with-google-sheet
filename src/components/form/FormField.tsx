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
    <div className={['form-group', className].filter(Boolean).join(' ')}>
      {label && (
        <label>
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      {children}
      {hint}
    </div>
  );
}
