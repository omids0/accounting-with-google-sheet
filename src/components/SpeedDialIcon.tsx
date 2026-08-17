type SpeedDialIconName = 'add' | 'refresh' | 'import' | 'export' | 'close';

const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export default function SpeedDialIcon({ name }: { name: SpeedDialIconName }) {
  switch (name) {
    case 'add':
      return (
        <svg {...svgProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...svgProps}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      );
    case 'import':
      return (
        <svg {...svgProps}>
          <path d="M12 3v12" />
          <path d="m7 10 5-5 5 5" />
          <path d="M5 21h14" />
        </svg>
      );
    case 'export':
      return (
        <svg {...svgProps}>
          <path d="M12 15V3" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case 'close':
      return (
        <svg {...svgProps}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
  }
}
