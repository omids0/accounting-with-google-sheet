import { beforeEach, describe, expect, it } from 'vitest';
import { getDataRevision } from './dataRevision';
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange';
import {
  invalidateDashboardCache,
  loadDashboardData,
  peekCachedDashboardData,
} from './dashboard';
import { getDateRange, getInstallmentDueRange } from '../utils/dateRange';
import { getJalaliParts } from '../utils/jalaliDate';
import { getDefaultNetAvailableConfig } from './settings';
import { clearStore } from './spreadsheetStore';
import {
  seedDashboardSheets,
  TEST_SPREADSHEET_ID,
  testSettings,
} from '../test/dashboardFixtures';

describe('notifySpreadsheetDataChanged', () => {
  beforeEach(() => {
    localStorage.clear();
    clearStore(TEST_SPREADSHEET_ID);
    invalidateDashboardCache(TEST_SPREADSHEET_ID);
    seedDashboardSheets(TEST_SPREADSHEET_ID, 1000);
  });

  it('invalidates dashboard cache and bumps revision', async () => {
    const range = getDateRange('month-to-date');
    const installmentRange = getInstallmentDueRange('month-to-date');
    const monthlyFlowYear = getJalaliParts(new Date()).year;
    const netAvailableConfig = getDefaultNetAvailableConfig();
    const revisionBefore = getDataRevision();

    await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(
      peekCachedDashboardData(
        testSettings,
        range,
        installmentRange,
        monthlyFlowYear,
        netAvailableConfig
      )
    ).not.toBeNull();

    notifySpreadsheetDataChanged(TEST_SPREADSHEET_ID);

    expect(getDataRevision()).toBe(revisionBefore + 1);
    expect(
      peekCachedDashboardData(
        testSettings,
        range,
        installmentRange,
        monthlyFlowYear,
        netAvailableConfig
      )
    ).toBeNull();
  });
});
