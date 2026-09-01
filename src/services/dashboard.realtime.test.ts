import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDateRange, getInstallmentDueRange } from '../utils/dateRange';
import { getJalaliParts } from '../utils/jalaliDate';
import { getDefaultNetAvailableConfig } from './settings';
import { clearStore, setSheetAllRows } from './spreadsheetStore';
import {
  invalidateDashboardCache,
  loadDashboardData,
  peekCachedDashboardData,
} from './dashboard';
import { bumpDataRevision } from './dataRevision';
import { notifySpreadsheetDataChanged } from './spreadsheetDataChange';
import { updateWalletAccount } from './wallet';
import { appendRecord } from './sheets';
import { WALLET_HEADERS, WALLET_SHEET } from './wallet';
import { RECEIVABLES_HEADERS, RECEIVABLES_SHEET } from './receivables';
import {
  seedDashboardSheets,
  TEST_SPREADSHEET_ID,
  testSettings,
} from '../test/dashboardFixtures';

vi.mock('./sheetSync', () => ({
  enqueueSheetWrite: vi.fn(),
  queueOutboxWrite: vi.fn(),
}));

describe('dashboard realtime updates', () => {
  beforeEach(() => {
    localStorage.clear();
    clearStore(TEST_SPREADSHEET_ID);
    invalidateDashboardCache(TEST_SPREADSHEET_ID);
    seedDashboardSheets(TEST_SPREADSHEET_ID, 100_000);
  });

  it('reflects wallet balance changes after notifySpreadsheetDataChanged', async () => {
    const range = getDateRange('month-to-date');
    const installmentRange = getInstallmentDueRange('month-to-date');
    const monthlyFlowYear = getJalaliParts(new Date()).year;
    const netAvailableConfig = getDefaultNetAvailableConfig();

    const initial = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(initial.financial.walletTotal).toBe(100_000);
    expect(initial.financial.totalAssets).toBe(100_000);
    expect(initial.financial.netAvailable).toBe(100_000);

    setSheetAllRows(TEST_SPREADSHEET_ID, WALLET_SHEET, [
      WALLET_HEADERS,
      ['wallet-1', '2024', 'Main wallet', '250000', ''],
    ]);

    const stalePeek = peekCachedDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );
    expect(stalePeek?.financial.walletTotal).toBe(100_000);

    notifySpreadsheetDataChanged(TEST_SPREADSHEET_ID);

    expect(
      peekCachedDashboardData(
        testSettings,
        range,
        installmentRange,
        monthlyFlowYear,
        netAvailableConfig
      )
    ).toBeNull();

    const updated = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(updated.financial.walletTotal).toBe(250_000);
    expect(updated.financial.totalAssets).toBe(250_000);
    expect(updated.financial.netAvailable).toBe(250_000);
  });

  it('reflects receivable totals after local store changes', async () => {
    const range = getDateRange('month-to-date');
    const installmentRange = getInstallmentDueRange('month-to-date');
    const monthlyFlowYear = getJalaliParts(new Date()).year;
    const netAvailableConfig = getDefaultNetAvailableConfig();

    const initial = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );
    expect(initial.financial.receivablesTotal).toBe(0);

    setSheetAllRows(TEST_SPREADSHEET_ID, RECEIVABLES_SHEET, [
      RECEIVABLES_HEADERS,
      [
        'recv-1',
        '2024',
        'Ali',
        'شخصی',
        '50000',
        '2024-01-01',
        '',
        '[]',
      ],
    ]);

    notifySpreadsheetDataChanged(TEST_SPREADSHEET_ID);

    const updated = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(updated.financial.receivablesTotal).toBe(50_000);
    expect(updated.financial.totalAssets).toBe(150_000);
    expect(updated.financial.netAvailable).toBe(150_000);
  });

  it('updates wallet totals through updateWalletAccount (real write path)', async () => {
    const range = getDateRange('month-to-date');
    const installmentRange = getInstallmentDueRange('month-to-date');
    const monthlyFlowYear = getJalaliParts(new Date()).year;
    const netAvailableConfig = getDefaultNetAvailableConfig();

    await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    await updateWalletAccount(TEST_SPREADSHEET_ID, {
      rowNumber: 2,
      id: 'wallet-1',
      createdAt: '2024',
      title: 'Main wallet',
      balance: 400_000,
      note: '',
    });

    const updated = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(updated.financial.walletTotal).toBe(400_000);
    expect(updated.financial.netAvailable).toBe(400_000);
  });

  it('updates income totals after appendRecord', async () => {
    const range = getDateRange('month-to-date');
    const installmentRange = getInstallmentDueRange('month-to-date');
    const monthlyFlowYear = getJalaliParts(new Date()).year;
    const netAvailableConfig = getDefaultNetAvailableConfig();
    const incomeForm = testSettings.forms.find((form) => form.type === 'income');
    if (!incomeForm) throw new Error('income form missing');

    const initial = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );
    expect(initial.totalIncome).toBe(0);

    await appendRecord(
      TEST_SPREADSHEET_ID,
      incomeForm,
      'income-1',
      '2024-01-01',
      {
        date: range.start,
        title: 'Salary',
        category: 'حقوق',
        amount: 75_000,
        note: '',
      }
    );

    const updated = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(updated.totalIncome).toBe(75_000);
    expect(updated.balance).toBe(75_000);
  });

  it('keeps stale dashboard cache when only revision bumps (regression)', async () => {
    const range = getDateRange('month-to-date');
    const installmentRange = getInstallmentDueRange('month-to-date');
    const monthlyFlowYear = getJalaliParts(new Date()).year;
    const netAvailableConfig = getDefaultNetAvailableConfig();

    await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    setSheetAllRows(TEST_SPREADSHEET_ID, WALLET_SHEET, [
      WALLET_HEADERS,
      ['wallet-1', '2024', 'Main wallet', '999999', ''],
    ]);

    bumpDataRevision();

    const stale = await loadDashboardData(
      testSettings,
      range,
      installmentRange,
      monthlyFlowYear,
      netAvailableConfig
    );

    expect(stale.financial.walletTotal).toBe(100_000);
  });
});
