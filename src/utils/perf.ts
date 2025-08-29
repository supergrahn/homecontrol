const marks = new Map<string, number>();

export function mark(key: string) {
  marks.set(key, Date.now());
}

export function measureFrom(key: string, label?: string) {
  const t0 = marks.get(key);
  const t1 = Date.now();
  if (typeof t0 === 'number') {
    const ms = t1 - t0;
  // keep last few marks only
  marks.delete(key);
  console.log('[perf]', label || key, ms + 'ms');
    return ms;
  }
  return null;
}

export function clearMark(key: string) {
  marks.delete(key);
}

export function hasMark(key: string) {
  return marks.has(key);
}
