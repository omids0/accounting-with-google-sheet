import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

export interface PageSpeedDialAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export interface PageSpeedDialConfig {
  ariaLabel: string;
  actions: PageSpeedDialAction[];
}

let activeConfig: PageSpeedDialConfig | null = null;
let activeSignature = '';
const listeners = new Set<() => void>();

function buildSignature(config: PageSpeedDialConfig | null): string {
  if (!config) return '';
  return JSON.stringify({
    ariaLabel: config.ariaLabel,
    actions: config.actions.map(({ id, label, disabled, className }) => ({
      id,
      label,
      disabled: !!disabled,
      className: className ?? '',
    })),
  });
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function publishPageSpeedDialConfig(config: PageSpeedDialConfig | null) {
  activeConfig = config;
  const nextSignature = buildSignature(config);
  if (nextSignature === activeSignature) return;
  activeSignature = nextSignature;
  notifyListeners();
}

export function getPageSpeedDialConfig() {
  return activeConfig;
}

export function usePageSpeedDialConfig() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((version) => version + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return activeConfig;
}

export function useRegisterPageSpeedDial(
  config: PageSpeedDialConfig | null,
  active = true
) {
  useLayoutEffect(() => {
    if (!active) return;
    publishPageSpeedDialConfig(config);
  });

  useLayoutEffect(() => {
    if (!active) return;
    return () => {
      activeConfig = null;
      activeSignature = '';
      notifyListeners();
    };
  }, [active]);
}
