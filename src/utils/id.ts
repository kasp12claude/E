export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(ts: number | string): string {
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formaterer tall med norsk desimalkomma og fornuftig antall siffer. */
export function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '–';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1e6 || abs < 1e-4) s = n.toExponential(3);
  else s = Number(n.toPrecision(digits)).toString();
  return s.replace('.', ',');
}

/** Leser et tall skrevet med komma eller punktum. */
export function parseNum(v: string | number | undefined): number {
  if (typeof v === 'number') return v;
  if (v === undefined) return NaN;
  const s = v.trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return NaN;
  return Number(s);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFilename(name: string): string {
  return (name || 'elektrostudio').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'elektrostudio';
}
