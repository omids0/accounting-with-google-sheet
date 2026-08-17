import { showInfo } from '../utils/toast';
import type { PageSpeedDialAction } from './usePageSpeedDial';

export function createPageSpeedDialActions({
  onAdd,
  onRefresh,
  refreshDisabled,
}: {
  onAdd: () => void;
  onRefresh: () => void;
  refreshDisabled?: boolean;
}): PageSpeedDialAction[] {
  return [
    {
      id: 'add',
      label: 'افزودن',
      icon: '✚',
      onClick: onAdd,
    },
    {
      id: 'refresh',
      label: 'بروزرسانی',
      icon: '↻',
      onClick: onRefresh,
      disabled: refreshDisabled,
    },
    {
      id: 'import',
      label: 'ایمپورت',
      icon: '📥',
      onClick: () => showInfo('ایمپورت به زودی اضافه می‌شود'),
    },
    {
      id: 'export',
      label: 'اکسپورت',
      icon: '📤',
      onClick: () => showInfo('اکسپورت به زودی اضافه می‌شود'),
    },
  ];
}
