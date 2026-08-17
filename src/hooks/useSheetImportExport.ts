import { useCallback } from 'react';
import { isTokenValid } from '../services/auth';
import type { ImportResult } from '../services/importExport';
import { getSettings } from '../services/settings';
import { pickTextFile } from '../utils/csv';
import { showError, showSuccess } from '../utils/toast';

export function useSheetImportExport({
  exportFn,
  importFn,
  onComplete,
  onReauth,
}: {
  exportFn: (spreadsheetId: string) => Promise<void>;
  importFn: (spreadsheetId: string, csvContent: string) => Promise<ImportResult>;
  onComplete: () => void | Promise<void>;
  onReauth?: () => void;
}) {
  const handleExport = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    try {
      await exportFn(settings.spreadsheetId);
      showSuccess('فایل اکسپورت شد');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در اکسپورت');
    }
  }, [exportFn, onReauth]);

  const handleImport = useCallback(async () => {
    const settings = getSettings();
    if (!settings?.spreadsheetId || !isTokenValid()) {
      onReauth?.();
      return;
    }

    try {
      const content = await pickTextFile();
      if (!content) return;

      const result = await importFn(settings.spreadsheetId, content);
      const skipped =
        result.skipped > 0 ? ` (${result.skipped.toLocaleString('fa-IR')} رد شد)` : '';
      showSuccess(`${result.imported.toLocaleString('fa-IR')} مورد وارد شد${skipped}`);
      await onComplete();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'خطا در ایمپورت');
    }
  }, [importFn, onComplete, onReauth]);

  return { handleExport, handleImport };
}
