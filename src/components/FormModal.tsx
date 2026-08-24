import { useEffect, type FormEvent, type ReactNode } from 'react';
import AppIcon from './AppIcon';

type FormModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving?: boolean;
  saveLabel: string;
  saveButtonClassName?: string;
  children: ReactNode;
};

export default function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  saving = false,
  saveLabel,
  saveButtonClassName = 'btn btn-primary',
  children,
}: FormModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  return (
    <div className="form-modal" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
      <button
        type="button"
        className="form-modal-backdrop"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-label="بستن"
      />

      <div className="form-modal-panel">
        <div className="form-modal-header">
          <h2 id="form-modal-title" className="form-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="form-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="بستن"
          >
            <AppIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-modal-body">{children}</div>

          <div className="form-actions form-modal-actions">
            {saving && <span className="spinner form-modal-spinner" aria-hidden />}
            <button type="submit" className={saveButtonClassName} disabled={saving}>
              {saveLabel}
            </button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
