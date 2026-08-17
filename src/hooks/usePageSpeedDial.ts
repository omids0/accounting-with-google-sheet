import { useEffect, useState } from 'react';

export interface PageSpeedDialAction {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface PageSpeedDialConfig {
  ariaLabel: string;
  actions: PageSpeedDialAction[];
}

let activeConfig: PageSpeedDialConfig | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setPageSpeedDialConfig(config: PageSpeedDialConfig | null) {
  activeConfig = config;
  notify();
}

export function usePageSpeedDialConfig() {
  const [config, setConfig] = useState(activeConfig);

  useEffect(() => {
    const listener = () => setConfig(activeConfig);
    listeners.add(listener);
    setConfig(activeConfig);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return config;
}

export function useRegisterPageSpeedDial(config: PageSpeedDialConfig | null) {
  useEffect(() => {
    setPageSpeedDialConfig(config);
    return () => setPageSpeedDialConfig(null);
  }, [config]);
}
