import { useEffect, useState, type CSSProperties } from 'react';
import SpeedDialIcon from './SpeedDialIcon';
import { getPageSpeedDialConfig, type PageSpeedDialAction } from '../hooks/usePageSpeedDial';

export default function PageSpeedDial({
  actions,
  ariaLabel,
}: {
  actions: PageSpeedDialAction[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);
  const handleOpen = () => setOpen(true);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="speed-dial-backdrop"
          onClick={handleClose}
          aria-label="بستن"
        />
      )}

      <div className="fab-container speed-dial-container">
        <div className={`speed-dial${open ? ' speed-dial--open' : ''}`}>
          <div className="speed-dial-actions" role="menu">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="speed-dial-action-wrap"
                style={{ '--action-index': index } as CSSProperties}
              >
                <button
                  type="button"
                  className={['speed-dial-action', action.className].filter(Boolean).join(' ')}
                  role="menuitem"
                  onClick={() => {
                    const latest = getPageSpeedDialConfig()?.actions.find(
                      (item) => item.id === action.id
                    );
                    if (latest?.disabled) return;
                    latest?.onClick();
                    handleClose();
                  }}
                  disabled={action.disabled}
                  aria-label={action.label}
                >
                  <span className="speed-dial-action-icon">{action.icon}</span>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`fab speed-dial-trigger${open ? ' speed-dial-trigger--open' : ''}`}
            onClick={() => (open ? handleClose() : handleOpen())}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <span className="speed-dial-trigger-icon">
              {open ? <SpeedDialIcon name="close" /> : <SpeedDialIcon name="add" />}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
