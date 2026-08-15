import type { VaultAssetType } from '../types';

const TGJU_API = 'https://call5.tgju.org/ajax.json';

const ASSET_TGJU_KEYS: Record<VaultAssetType, string> = {
  sekeb: 'sekeb',
  sekee: 'sekee',
  nim: 'nim',
  rob: 'rob',
  gerami: 'gerami',
  geram18: 'geram18',
  usd: 'price_dollar_rl',
};

export const VAULT_ASSET_OPTIONS: {
  value: VaultAssetType;
  label: string;
  unit: string;
  hint?: string;
}[] = [
  { value: 'sekeb', label: 'سکه بهار آزادی', unit: 'عدد' },
  { value: 'sekee', label: 'سکه امامی', unit: 'عدد' },
  { value: 'nim', label: 'نیم سکه', unit: 'عدد' },
  { value: 'rob', label: 'ربع سکه', unit: 'عدد' },
  { value: 'gerami', label: 'سکه گرمی', unit: 'عدد', hint: 'هر سکه حدود ۱ گرم طلا' },
  { value: 'geram18', label: 'طلای ۱۸ عیار', unit: 'گرم', hint: 'مقدار را به گرم وارد کنید' },
  { value: 'usd', label: 'دلار', unit: 'دلار' },
];

export function getAssetLabel(assetType: VaultAssetType): string {
  return VAULT_ASSET_OPTIONS.find((a) => a.value === assetType)?.label ?? assetType;
}

export function getAssetUnit(assetType: VaultAssetType): string {
  return VAULT_ASSET_OPTIONS.find((a) => a.value === assetType)?.unit ?? '';
}

function parseTgjuPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const num = Number(String(raw).replace(/,/g, ''));
  return num / 10;
}

export async function fetchTgjuPrices(): Promise<Record<VaultAssetType, number>> {
  const res = await fetch(TGJU_API);
  if (!res.ok) throw new Error('خطا در دریافت قیمت از tgju.org');

  const data = (await res.json()) as { current?: Record<string, { p?: string }> };
  const current = data.current ?? {};

  const prices = {} as Record<VaultAssetType, number>;
  for (const [asset, key] of Object.entries(ASSET_TGJU_KEYS) as [VaultAssetType, string][]) {
    prices[asset] = parseTgjuPrice(current[key]?.p);
  }
  return prices;
}
