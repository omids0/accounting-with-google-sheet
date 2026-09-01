import { useEffect, useState } from 'react';

export interface ChartTheme {
  income: string;
  expense: string;
  primary: string;
  muted: string;
  grid: string;
  surface: string;
  accentSoft: string;
  incomePalette: string[];
  expensePalette: string[];
}

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

/** SVG fill attributes do not support color-mix(); blend in JS instead. */
function mixColors(base: string, surface: string, baseWeight: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(surface);
  if (!a || !b) return base;

  const weight = Math.min(1, Math.max(0, baseWeight));
  const r = Math.round(a.r * weight + b.r * (1 - weight));
  const g = Math.round(a.g * weight + b.g * (1 - weight));
  const blue = Math.round(a.b * weight + b.b * (1 - weight));
  return `rgb(${r}, ${g}, ${blue})`;
}

function buildPalette(base: string, surface: string, steps: number[]): string[] {
  return steps.map((weight) => mixColors(base, surface, weight));
}

function readTheme(): ChartTheme {
  const income = readCssVar('--color-income', '#16a34a');
  const expense = readCssVar('--color-expense', '#dc2626');
  const primary = readCssVar('--color-primary', '#0f766e');
  const surface = readCssVar('--color-surface', '#ffffff');

  return {
    income,
    expense,
    primary,
    muted: readCssVar('--color-text-muted', '#5f8a85'),
    grid: readCssVar('--color-border', '#99f6e4'),
    surface,
    accentSoft: readCssVar('--color-accent-soft', '#ccfbf1'),
    incomePalette: buildPalette(income, surface, [1, 0.88, 0.76, 0.64, 0.52]),
    expensePalette: buildPalette(expense, surface, [1, 0.88, 0.76, 0.64, 0.52]),
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
