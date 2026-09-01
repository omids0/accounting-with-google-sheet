let revision = 0;
const listeners = new Set<() => void>();

export function getDataRevision(): number {
  return revision;
}

export function bumpDataRevision(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDataRevision(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
