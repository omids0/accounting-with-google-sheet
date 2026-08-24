import AppIcon, { type AppIconName } from './AppIcon';

type SpeedDialIconName = Extract<AppIconName, 'add' | 'refresh' | 'import' | 'export' | 'close'>;

export default function SpeedDialIcon({ name }: { name: SpeedDialIconName }) {
  return <AppIcon name={name} size={18} strokeWidth={2} />;
}
