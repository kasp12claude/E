import type { DrawingDoc } from '../types';
import { getSymbol } from '../library/symbols';
import { elementMap, polylineLength, resolveWire } from './geometry';

export interface MaterialRow {
  key: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  labels: string[];
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Lager en enkel materialliste fra en tegning (antall komponenter, kabel- og kanallengder). */
export function materialsFromDoc(doc: DrawingDoc): MaterialRow[] {
  const rows = new Map<string, MaterialRow>();
  const add = (key: string, name: string, spec: string, qty: number, unit: string, label?: string) => {
    const r = rows.get(key) ?? { key, name, spec, qty: 0, unit, labels: [] };
    r.qty += qty;
    if (label) r.labels.push(label);
    rows.set(key, r);
  };
  const map = elementMap(doc.elements);
  const isPlan = doc.kind === 'floorplan';
  for (const e of doc.elements) {
    if (e.type === 'component') {
      const def = getSymbol(e.symbolId);
      if (!def) continue;
      if (['junction', 'ground', 'ref-tag', 'single-line', 'bus-3', 'bus-5', 'connection-point', 'plan-door', 'plan-window'].includes(def.id)) continue;
      if (def.id === 'plan-duct' || def.id === 'plan-conduit') {
        add(`${def.id}:${e.props.dim}`, def.name, def.id === 'plan-duct' ? `${e.props.dim} mm` : `Ø${e.props.dim} mm`, num(e.props.lengde), 'm');
        continue;
      }
      const spec = def.summary?.(e.props) ?? '';
      add(`${def.id}:${spec}`, def.name, spec, 1, 'stk', e.label || undefined);
    } else if (e.type === 'wire' && e.kind === 'cable') {
      const spec = e.wireNo || 'Kabel (ikke spesifisert)';
      add(`cable:${spec}`, 'Kabel', spec, polylineLength(resolveWire(e, map)) / 100, 'm');
    } else if (e.type === 'wire' && e.kind === 'wire' && !isPlan) {
      // Ledninger i skjema regnes som antall forbindelser
      add('wire', 'Ledningsforbindelser i skjema', '', 1, 'stk');
    }
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

export function materialsCsv(rows: MaterialRow[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ['Komponent;Spesifikasjon;Antall;Enhet;Betegnelser'];
  for (const r of rows) lines.push([esc(r.name), esc(r.spec), r.unit === 'm' ? r.qty.toFixed(1).replace('.', ',') : String(r.qty), r.unit, esc(r.labels.join(', '))].join(';'));
  return '﻿' + lines.join('\r\n');
}
