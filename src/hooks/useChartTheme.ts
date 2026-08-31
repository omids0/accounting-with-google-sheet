import { useEffect, useState } from 'react';

export interface ChartTheme {
  income: string;
  expense: string;
  primary: string;
  muted: string;
  grid: string;
  surface: string;
  incomePalette: string[];
  expensePalette: string[];
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function buildPalette(base: string, steps: number[]): string[] {
  return steps.map((opacity) => {
    const pct = Math.round(opacity * 100);
    return `color-mix(in srgb, ${base} ${pct}%, var(--color-surface))`;
  });
}

function readTheme(): ChartTheme {
  const income = readCssVar('--color-income', '#16a34a');
  const expense = readCssVar('--color-expense', '#dc2626');
  const primary = readCssVar('--color-primary', '#0f766e');

  return {
    income,
    expense,
    primary,
    muted: readCssVar('--color-text-muted', '#5f8a85'),
    grid: readCssVar('--color-border', '#99f6e4'),
    surface: readCssVar('--color-surface', '#ffffff'),
    incomePalette: buildPalette(income, [1, 0.88, 0.76, 0.64, 0.52]),
    expensePalette: buildPalette(expense, [1, 0.88, 0.76, 0.64, 0.52]),
  };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme);

  useEffect(() => {
    const refresh = () => setTheme(readTheme());
    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
