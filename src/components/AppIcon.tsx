export type AppIconName =
  | 'installments'
  | 'debt'
  | 'checks'
  | 'dashboard'
  | 'receivables'
  | 'treasury'
  | 'wallet'
  | 'records'
  | 'search'
  | 'empty-inbox'
  | 'edit'
  | 'folder'
  | 'warning'
  | 'back'
  | 'menu'
  | 'settings'
  | 'close'
  | 'check'
  | 'x-mark'
  | 'add'
  | 'refresh'
  | 'import'
  | 'export'
  | 'pdf'
  | 'trash'
  | 'calculator'
  | 'chevron-down'
  | 'swap';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const svgBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export default function AppIcon({
  name,
  size = 22,
  className,
  strokeWidth = 1.75,
}: AppIconProps) {
  const props = { ...svgBase, width: size, height: size, strokeWidth, className };

  switch (name) {
    case 'installments':
      return (
        <svg {...props}>
          <path d="M8 2.5v2.5M16 2.5v2.5" />
          <rect x="3.5" y="4.5" width="17" height="16.5" rx="2.2" />
          <path d="M3.5 10h17" />
          <circle cx="8.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'debt':
      return (
        <svg {...props}>
          <rect x="7" y="4.5" width="10" height="12" rx="1.5" />
          <path d="M9 9h6" />
          <path d="M9 12h4" />
          <path d="M12 16.5v4.5" />
          <path d="M9.5 18.75 12 21.25 14.5 18.75" />
        </svg>
      );

    case 'checks':
      return (
        <svg {...props}>
          <path d="M14 3H7.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2H17a2 2 0 0 0 2-2V8.5L14 3Z" />
          <path d="M14 3v5.5H19.5" />
          <path d="M8.5 12.5h7" />
          <path d="M8.5 16h4.5" />
          <path d="M15.5 16.5 17 18l3.5-4" />
        </svg>
      );

    case 'dashboard':
      return (
        <svg {...props}>
          <path d="M4.5 19.5V5.5" />
          <path d="M4.5 19.5h15" />
          <path d="M8 19.5V12" strokeWidth={2.5} />
          <path d="M12 19.5V8.5" strokeWidth={2.5} />
          <path d="M16 19.5V14" strokeWidth={2.5} />
        </svg>
      );

    case 'receivables':
      return (
        <svg {...props}>
          <rect x="7" y="4.5" width="10" height="12" rx="1.5" />
          <path d="M9 9h6" />
          <path d="M9 12h4" />
          <path d="M12 21.25v-4.5" />
          <path d="M9.5 19.5 12 17 14.5 19.5" />
        </svg>
      );

    case 'treasury':
      return (
        <svg {...props}>
          <path d="M9.5 5a2.5 2.5 0 0 1 5 0" />
          <path d="M6.5 8.5h11" />
          <path d="M6.5 8.5V10.5" />
          <path d="M17.5 8.5V10.5" />
          <path d="M5.5 10.5h13v9a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
          <path d="M11 7.5h2" />
          <circle cx="12" cy="14.5" r="1.4" />
          <path d="M12 15.9v2.1" />
        </svg>
      );

    case 'wallet':
      return (
        <svg {...props}>
          <path d="M19.5 9.5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14.5a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Z" />
          <path d="M17.5 9.5V7a2.5 2.5 0 0 0-2.5-2.5H7" />
          <circle cx="17" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
          <path d="M3 12.5h16.5" />
        </svg>
      );

    case 'records':
      return (
        <svg {...props}>
          <path d="M9 3.5h7.5L19.5 6.5V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V5A1.5 1.5 0 0 1 6 3.5H9Z" />
          <path d="M9 3.5V7.5h7.5" />
          <path d="M8 12.5h8" />
          <path d="M8 16h8" />
        </svg>
      );

    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.5-4.5" />
        </svg>
      );

    case 'empty-inbox':
      return (
        <svg {...props}>
          <path d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5" />
          <path d="M4 8.5 8.5 13h7L20 8.5" />
          <path d="M4 8.5h16" />
          <path d="M9.5 13 12 15.5 14.5 13" />
        </svg>
      );

    case 'edit':
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );

    case 'folder':
      return (
        <svg {...props}>
          <path d="M4.5 6.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-5.5L9.5 4.5H6.5a2 2 0 0 0-2 2Z" />
          <path d="M4.5 10.5h15" />
        </svg>
      );

    case 'warning':
      return (
        <svg {...props}>
          <path d="M12 3.5 3.5 20.5h17L12 3.5Z" />
          <path d="M12 10v4.5" />
          <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'back':
      return (
        <svg {...props}>
          <path d="M14 6.5 8.5 12 14 17.5" />
        </svg>
      );

    case 'menu':
      return (
        <svg {...props}>
          <path d="M4.5 7h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 17h15" />
        </svg>
      );

    case 'settings':
      return (
        <svg {...props}>
          <path d="M10.4 3.5h3.2l.35 1.95a6.8 6.8 0 0 1 1.65.7l1.75-1.05 2.25 2.25-1.05 1.75c.32.52.54 1.08.7 1.65l1.95.35v3.2l-1.95.35a6.8 6.8 0 0 1-.7 1.65l1.05 1.75-2.25 2.25-1.75-1.05a6.8 6.8 0 0 1-1.65.7l-.35 1.95h-3.2l-.35-1.95a6.8 6.8 0 0 1-1.65-.7l-1.75 1.05-2.25-2.25 1.05-1.75a6.8 6.8 0 0 1-.7-1.65l-1.95-.35v-3.2l1.95-.35c.16-.57.38-1.13.7-1.65l-1.05-1.75 2.25-2.25 1.75 1.05c.52-.32 1.08-.54 1.65-.7l.35-1.95Z" />
          <circle cx="12" cy="12" r="2.75" />
        </svg>
      );

    case 'close':
      return (
        <svg {...props}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );

    case 'check':
      return (
        <svg {...props}>
          <path d="M5.5 12.5 9.5 16.5 18.5 7.5" />
        </svg>
      );

    case 'x-mark':
      return (
        <svg {...props}>
          <path d="M16 8 8 16" />
          <path d="m8 8 8 8" />
        </svg>
      );

    case 'add':
      return (
        <svg {...props}>
          <path d="M12 5.5v13" />
          <path d="M5.5 12h13" />
        </svg>
      );

    case 'refresh':
      return (
        <svg {...props}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      );

    case 'import':
      return (
        <svg {...props}>
          <path d="M12 3v12" />
          <path d="m7 10 5-5 5 5" />
          <path d="M5 21h14" />
        </svg>
      );

    case 'export':
      return (
        <svg {...props}>
          <path d="M12 15V3" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );

    case 'pdf':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M10 13h4" />
          <path d="M10 17h4" />
        </svg>
      );

    case 'trash':
      return (
        <svg {...props}>
          <path d="M3.5 6.5h17" />
          <path d="M8.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v1.5" />
          <path d="M19 6.5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );

    case 'calculator':
      return (
        <svg {...props}>
          <rect x="5.5" y="3.5" width="13" height="17" rx="2" />
          <path d="M8.5 7.5h7" />
          <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
          <path d="M8.5 18.5h7" />
        </svg>
      );

    case 'chevron-down':
      return (
        <svg {...props}>
          <path d="M6.5 9.5 12 15 17.5 9.5" />
        </svg>
      );

    case 'swap':
      return (
        <svg {...props}>
          <path d="M7 8.5h11" />
          <path d="M15.5 6.5 18.5 8.5 15.5 10.5" />
          <path d="M17 15.5H6" />
          <path d="M8.5 13.5 5.5 15.5 8.5 17.5" />
        </svg>
      );
  }
}
