import type { DrawingDoc, PlanTask, TaskStatus } from '../../types';
import { getSymbol } from '../../library/symbols';
import { elementMap, polylineLength, resolveWire } from '../../editor/geometry';
import { todayIso } from '../../utils/id';
import { NON_COMPONENT_SYMBOLS } from '../docs/reportUtils';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  'ikke-startet': 'Ikke startet',
  pagar: 'Pågår',
  ferdig: 'Ferdig',
  blokkert: 'Blokkert',
};

export const STATUS_BADGE: Record<TaskStatus, string> = {
  'ikke-startet': '',
  pagar: 'badge-blue',
  ferdig: 'badge-green',
  blokkert: 'badge-red',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  'ikke-startet': '#64748b',
  pagar: '#3b82f6',
  ferdig: '#22c55e',
  blokkert: '#ef4444',
};

export function isOverdue(t: PlanTask, today = todayIso()) {
  return !!t.due && t.due < today && t.status !== 'ferdig';
}

export function parseIso(d: string) {
  return new Date(`${d}T00:00:00`);
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
}

export function addDays(d: string, n: number) {
  const x = parseIso(d);
  x.setDate(x.getDate() + n);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const AUTO_NOTE = 'Hentet fra tegninger';

/** Symboler som ikke er innkjøpsmateriell */
const NOT_MATERIAL = new Set([...NON_COMPONENT_SYMBOLS, 'plan-door', 'plan-window']);

const num = (v: string | undefined) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Teller komponenter per symbol i tegningene og summerer kabellengder (kabler i plantegninger).
 * 1 tegneenhet = 1 cm i plantegning.
 */
export function materialsFromDocs(docs: DrawingDoc[]): { name: string; qty: number; unit: string }[] {
  const items = new Map<string, { name: string; qty: number; unit: string }>();
  const add = (name: string, qty: number, unit: string) => {
    const key = `${name}|${unit}`;
    const it = items.get(key) ?? { name, qty: 0, unit };
    it.qty += qty;
    items.set(key, it);
  };
  for (const d of docs) {
    if (d.kind === 'simulation') continue;
    const map = elementMap(d.elements);
    for (const el of d.elements) {
      if (el.type === 'component') {
        if (NOT_MATERIAL.has(el.symbolId)) continue;
        const def = getSymbol(el.symbolId);
        if (!def) continue;
        if (el.symbolId === 'plan-duct' || el.symbolId === 'plan-conduit') {
          add(`${def.name} ${el.props.dim ?? ''}${el.symbolId === 'plan-conduit' ? ' mm' : ''}`.trim(), num(el.props.lengde), 'm');
          continue;
        }
        const summary = def.summary?.(el.props);
        add(summary ? `${def.name} (${summary})` : def.name, 1, 'stk');
      } else if (el.type === 'wire' && el.kind === 'cable' && d.kind === 'floorplan') {
        const meters = polylineLength(resolveWire(el, map)) / 100;
        add(el.wireNo ? `Kabel ${el.wireNo}` : 'Kabel (type ikke angitt)', meters, 'm');
      }
    }
  }
  return [...items.values()]
    .map((i) => ({ ...i, qty: i.unit === 'm' ? Math.ceil(i.qty * 10) / 10 : i.qty }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

export const COMMON_TOOLS = [
  'Multimeter',
  'Spenningsprøver (godkjent type)',
  'Isolert skrutrekkersett',
  'Avisoleringstang',
  'Sidebitetang',
  'Kombinasjonstang',
  'Presstang for endehylser',
  'Kabelkniv',
  'Målebånd',
  'Vater',
  'Drill/skrutrekker',
  'Vernebriller',
];
