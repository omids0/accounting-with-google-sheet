import type { ReactNode } from 'react';

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
  | 'chart'
  | 'chevron-down'
  | 'swap';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

type IconSvgProps = {
  width: number;
  height: number;
  strokeWidth: number;
  className?: string;
};

function IconSvg({
  width,
  height,
  strokeWidth,
  className,
  children,
}: IconSvgProps & { children: ReactNode }) {
  return (
    <svg
      className={`app-icon${className ? ` ${className}` : ''}`}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function AppIcon({
  name,
  size = 22,
  className,
  strokeWidth = 2,
}: AppIconProps) {
  const props = { width: size, height: size, strokeWidth, className };

  switch (name) {
    case 'installments':
      return (
        <IconSvg {...props}>
          <rect className="app-icon__bg" x="3" y="4" width="18" height="17" rx="3" stroke="none" />
          <path d="M3 9.5h18" />
          <path d="M8 2.5v3" />
          <path d="M16 2.5v3" />
          <rect x="7" y="12.5" width="3.5" height="3.5" rx="0.8" className="app-icon__accent" stroke="none" />
          <rect x="12.25" y="12.5" width="3.5" height="3.5" rx="0.8" className="app-icon__accent" stroke="none" />
          <rect x="7" y="17" width="3.5" height="3.5" rx="0.8" className="app-icon__accent" stroke="none" />
          <path d="M12.25 17h3.5" />
        </IconSvg>
      );

    case 'debt':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M5 8.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
            stroke="none"
          />
          <path d="M5 8.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
          <path d="M7.5 13h9" />
          <path d="M7.5 16h5.5" />
          <path d="M12 5.5v2.5" />
          <path d="M9.5 8 12 5.5 14.5 8" />
        </IconSvg>
      );

    case 'checks':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M7 3.5h8l4.5 4.5V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z"
            stroke="none"
          />
          <path d="M7 3.5h8l4.5 4.5V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z" />
          <path d="M15 3.5v4.5h4.5" />
          <path d="M8.5 12.5h7" />
          <path d="M8.5 15.5h4.5" />
          <circle cx="17" cy="17" r="3.25" className="app-icon__accent" stroke="none" />
          <path d="M15.6 17l1.2 1.2 2.6-2.6" strokeWidth={2.2} />
        </IconSvg>
      );

    case 'dashboard':
      return (
        <IconSvg {...props}>
          <rect className="app-icon__bg" x="4" y="4" width="7" height="7" rx="2" stroke="none" />
          <rect className="app-icon__bg" x="13" y="4" width="7" height="7" rx="2" stroke="none" />
          <rect className="app-icon__bg" x="4" y="13" width="7" height="7" rx="2" stroke="none" />
          <rect className="app-icon__bg" x="13" y="13" width="7" height="7" rx="2" stroke="none" />
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="4" width="7" height="7" rx="2" />
          <rect x="4" y="13" width="7" height="7" rx="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" />
        </IconSvg>
      );

    case 'receivables':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M4.5 10.5h15a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
            stroke="none"
          />
          <path d="M4.5 10.5h15a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z" />
          <path d="M8 7.5h8" />
          <path d="M10 7.5V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1.5" />
          <circle cx="12" cy="15.5" r="1.35" className="app-icon__accent" stroke="none" />
          <path d="M12 13.5v-1" />
          <path d="M12 17.5v1.5" />
          <path d="M9.5 19.5 12 22 14.5 19.5" />
        </IconSvg>
      );

    case 'treasury':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M5.5 9.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
            stroke="none"
          />
          <path d="M9 6.5a3 3 0 0 1 6 0" />
          <path d="M5.5 9.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="14.5" r="2.25" className="app-icon__accent" stroke="none" />
          <path d="M12 12.25v-0.75" />
          <path d="M12 16.75v1" />
        </IconSvg>
      );

    case 'wallet':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M4 8.5h15.5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
            stroke="none"
          />
          <path d="M4 8.5h15.5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
          <path d="M16.5 8.5V6.8A2.3 2.3 0 0 0 14.2 4.5H7" />
          <rect x="15.5" y="12.5" width="4" height="3.5" rx="1" className="app-icon__accent" stroke="none" />
          <circle cx="17.2" cy="14.25" r="0.75" fill="currentColor" stroke="none" />
        </IconSvg>
      );

    case 'records':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M8 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z"
            stroke="none"
          />
          <path d="M8 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z" />
          <path d="M8 3.5V7.5h7.2" />
          <path d="M8.5 12h7" />
          <path d="M8.5 15.5h7" />
          <path d="M8.5 19h4.5" />
        </IconSvg>
      );

    case 'search':
      return (
        <IconSvg {...props}>
          <circle cx="11" cy="11" r="6.25" className="app-icon__bg" stroke="none" />
          <circle cx="11" cy="11" r="6.25" />
          <path d="M20 20l-4.75-4.75" />
        </IconSvg>
      );

    case 'empty-inbox':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5"
            stroke="none"
          />
          <path d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5" />
          <path d="M4 8.5 9 13h6l5-4.5" />
          <path d="M4 8.5h16" />
          <path d="M10 13l2 2.5 2-2.5" />
        </IconSvg>
      );

    case 'edit':
      return (
        <IconSvg {...props}>
          <path className="app-icon__bg" d="M14.5 4.5 19.5 9.5 8 21H3v-5Z" stroke="none" />
          <path d="M14.5 4.5 19.5 9.5 8 21H3v-5Z" />
          <path d="M12 20h9" />
        </IconSvg>
      );

    case 'folder':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M4.5 7.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-5.5L9.5 5.5H6.5a2 2 0 0 0-2 2Z"
            stroke="none"
          />
          <path d="M4.5 7.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-5.5L9.5 5.5H6.5a2 2 0 0 0-2 2Z" />
          <path d="M4.5 10.5h15" />
        </IconSvg>
      );

    case 'warning':
      return (
        <IconSvg {...props}>
          <path className="app-icon__bg" d="M12 4 4.5 19.5h15L12 4Z" stroke="none" />
          <path d="M12 4 4.5 19.5h15L12 4Z" />
          <path d="M12 10v4.25" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </IconSvg>
      );

    case 'back':
      return (
        <IconSvg {...props}>
          <path d="M14 6.5 8.5 12 14 17.5" />
        </IconSvg>
      );

    case 'menu':
      return (
        <IconSvg {...props}>
          <path d="M4.5 7h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 17h15" />
        </IconSvg>
      );

    case 'settings':
      return (
        <IconSvg {...props}>
          <circle cx="12" cy="12" r="3.1" className="app-icon__bg" stroke="none" />
          <path d="M10.2 3.8h3.6l.4 2.1a6.6 6.6 0 0 1 1.7.8l1.9-1.1 2.6 2.6-1.1 1.9c.33.53.56 1.1.72 1.7l2.1.4v3.6l-2.1.4a6.6 6.6 0 0 1-.72 1.7l1.1 1.9-2.6 2.6-1.9-1.1a6.6 6.6 0 0 1-1.7.8l-.4 2.1h-3.6l-.4-2.1a6.6 6.6 0 0 1-1.7-.8l-1.9 1.1-2.6-2.6 1.1-1.9a6.6 6.6 0 0 1-.72-1.7l-2.1-.4v-3.6l2.1-.4c.16-.57.39-1.14.72-1.7l-1.1-1.9 2.6-2.6 1.9 1.1c.52-.32 1.08-.56 1.7-.8l.4-2.1Z" />
          <circle cx="12" cy="12" r="2.6" />
        </IconSvg>
      );

    case 'close':
      return (
        <IconSvg {...props}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </IconSvg>
      );

    case 'check':
      return (
        <IconSvg {...props}>
          <path d="M5.5 12.5 9.5 16.5 18.5 7.5" />
        </IconSvg>
      );

    case 'x-mark':
      return (
        <IconSvg {...props}>
          <path d="M16 8 8 16" />
          <path d="m8 8 8 8" />
        </IconSvg>
      );

    case 'add':
      return (
        <IconSvg {...props}>
          <circle cx="12" cy="12" r="8.5" className="app-icon__bg" stroke="none" />
          <path d="M12 7.5v9" />
          <path d="M7.5 12h9" />
        </IconSvg>
      );

    case 'refresh':
      return (
        <IconSvg {...props}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </IconSvg>
      );

    case 'import':
      return (
        <IconSvg {...props}>
          <path d="M12 3.5v11.5" />
          <path d="m7.5 11 4.5-4.5 4.5 4.5" />
          <path d="M5 20.5h14" />
        </IconSvg>
      );

    case 'export':
      return (
        <IconSvg {...props}>
          <path d="M12 15V3.5" />
          <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
          <path d="M5 20.5h14" />
        </IconSvg>
      );

    case 'pdf':
      return (
        <IconSvg {...props}>
          <path
            className="app-icon__bg"
            d="M7 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z"
            stroke="none"
          />
          <path d="M7 3.5h7.2L18.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 19V5.3A1.8 1.8 0 0 1 7 3.5Z" />
          <path d="M15 3.5v3.3h3.3" />
          <path d="M8.5 12.5h7" />
          <path d="M8.5 16h5" />
        </IconSvg>
      );

    case 'trash':
      return (
        <IconSvg {...props}>
          <path d="M3.5 6.5h17" />
          <path d="M8.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v1.5" />
          <path
            className="app-icon__bg"
            d="M6.5 6.5v13a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-13"
            stroke="none"
          />
          <path d="M6.5 6.5v13a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-13" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </IconSvg>
      );

    case 'calculator':
      return (
        <IconSvg {...props}>
          <rect className="app-icon__bg" x="5.5" y="3.5" width="13" height="17" rx="2.2" stroke="none" />
          <rect x="5.5" y="3.5" width="13" height="17" rx="2.2" />
          <path d="M8.5 7.5h7" />
          <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
          <path d="M8.5 18.5h7" />
        </IconSvg>
      );

    case 'chart':
      return (
        <IconSvg {...props}>
          <path className="app-icon__bg" d="M4.5 19.5V5.5" stroke="none" />
          <path className="app-icon__bg" d="M4.5 19.5h15" stroke="none" />
          <path d="M4.5 19.5V5.5" />
          <path d="M4.5 19.5h15" />
          <path d="M8 19.5V12" strokeWidth={2.6} />
          <path d="M12 19.5V8.5" strokeWidth={2.6} />
          <path d="M16 19.5V14" strokeWidth={2.6} />
        </IconSvg>
      );

    case 'chevron-down':
      return (
        <IconSvg {...props}>
          <path d="M6.5 9.5 12 15 17.5 9.5" />
        </IconSvg>
      );

    case 'swap':
      return (
        <IconSvg {...props}>
          <path d="M7 8.5h11" />
          <path d="M15.5 6.5 18.5 8.5 15.5 10.5" />
          <path d="M17 15.5H6" />
          <path d="M8.5 13.5 5.5 15.5 8.5 17.5" />
        </IconSvg>
      );
  }
}
