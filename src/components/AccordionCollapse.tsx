import { useEffect, useState, type ReactNode, type TransitionEvent } from 'react';

type AccordionCollapseProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

export function AccordionCollapse({ open, children, className = '' }: AccordionCollapseProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
  }, [open]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (!open && event.propertyName === 'grid-template-rows') {
      setMounted(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={`accordion-collapse${visible ? ' accordion-collapse--open' : ''}${className ? ` ${className}` : ''}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="accordion-collapse__inner">{children}</div>
    </div>
  );
}
