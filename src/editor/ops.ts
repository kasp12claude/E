// Rene funksjoner som endrer et DrawingDoc. Returnerer alltid nye objekter.
import type { ComponentEl, DrawingDoc, Element, Pt, WireEl } from '../types';
import { defaultProps, getSymbol } from '../library/symbols';
import { uid } from '../utils/id';
import { boxesIntersect, elementBounds, elementMap, sheetSize, snapTo, terminalPos } from './geometry';

const CONTACT_PARENT: Record<string, string[]> = {
  'relay-no': ['relay-coil', 'contactor-coil', 'timer-on', 'timer-off'],
  'relay-nc': ['relay-coil', 'contactor-coil', 'timer-on', 'timer-off'],
  'contactor-main': ['contactor-coil'],
  'overload-nc': ['motor-protection'],
};

/** Neste ledige betegnelse, f.eks. F3 når F1 og F2 finnes. */
export function nextLabel(prefix: string, elements: Element[]): string {
  if (!prefix) return '';
  let max = 0;
  const re = new RegExp(`^-?${prefix}(\\d+)$`);
  for (const e of elements) {
    if (e.type !== 'component') continue;
    const m = re.exec(e.label);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

export function suggestLabel(symbolId: string, elements: Element[]): string {
  const def = getSymbol(symbolId);
  if (!def) return '';
  const parents = CONTACT_PARENT[symbolId];
  if (parents) {
    // Kontakter får samme betegnelse som sist plasserte spole/vern
    for (let i = elements.length - 1; i >= 0; i--) {
      const e = elements[i];
      if (e.type === 'component' && parents.includes(e.symbolId) && e.label) return e.label;
    }
  }
  return nextLabel(def.prefix, elements);
}

export function createComponent(symbolId: string, at: Pt, elements: Element[]): ComponentEl | null {
  const def = getSymbol(symbolId);
  if (!def) return null;
  return {
    id: uid('c'),
    type: 'component',
    symbolId,
    x: at.x,
    y: at.y,
    rot: 0,
    label: suggestLabel(symbolId, elements),
    showLabel: true,
    props: defaultProps(def),
  };
}

export function withElements(doc: DrawingDoc, elements: Element[]): DrawingDoc {
  return { ...doc, elements, updatedAt: Date.now() };
}

export function addElements(doc: DrawingDoc, els: Element[]): DrawingDoc {
  return withElements(doc, [...doc.elements, ...els]);
}

export function updateElement(doc: DrawingDoc, id: string, patch: Partial<Element>): DrawingDoc {
  return withElements(
    doc,
    doc.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)),
  );
}

export function deleteElements(doc: DrawingDoc, ids: Set<string>): DrawingDoc {
  const map = elementMap(doc.elements);
  const kept: Element[] = [];
  for (const e of doc.elements) {
    if (ids.has(e.id)) continue;
    if (e.type === 'wire') {
      // Løsne ledninger fra komponenter som slettes (de blir liggende som løse ender)
      let w = e;
      for (const end of ['start', 'end'] as const) {
        const ref = w[end];
        if (ref && ids.has(ref.el)) {
          const c = map.get(ref.el);
          const t = c?.type === 'component' ? terminalPos(c, ref.t) : undefined;
          const pts = [...w.points];
          if (t) pts[end === 'start' ? 0 : pts.length - 1] = { x: t.x, y: t.y };
          w = { ...w, points: pts, [end]: undefined };
        }
      }
      kept.push(w);
    } else kept.push(e);
  }
  return withElements(doc, kept);
}

function translatePt(p: Pt, dx: number, dy: number): Pt {
  return { x: p.x + dx, y: p.y + dy };
}

function translateEl(e: Element, dx: number, dy: number): Element {
  switch (e.type) {
    case 'component':
    case 'text':
    case 'rect':
      return { ...e, x: e.x + dx, y: e.y + dy };
    case 'wire':
    case 'wall':
      return { ...e, points: e.points.map((p) => translatePt(p, dx, dy)) };
    case 'dimension':
      return { ...e, a: translatePt(e.a, dx, dy), b: translatePt(e.b, dx, dy) };
  }
}

/** Flytter elementer. Ledninger festet til flyttede komponenter følger med og holdes rettvinklet. */
export function moveElements(doc: DrawingDoc, ids: Set<string>, dx: number, dy: number): DrawingDoc {
  if (dx === 0 && dy === 0) return doc;
  const moved = new Set(ids);
  const elements = doc.elements.map((e) => {
    if (moved.has(e.id)) return translateEl(e, dx, dy);
    if (e.type === 'wire') {
      const sMoved = !!e.start && moved.has(e.start.el);
      const eMoved = !!e.end && moved.has(e.end.el);
      if (!sMoved && !eMoved) return e;
      if (sMoved && eMoved) return translateEl(e, dx, dy);
      const pts = e.points.map((p) => ({ ...p }));
      const adjust = (iEnd: number, iNb: number) => {
        const end = pts[iEnd];
        const nb = pts[iNb];
        const wasVertical = Math.abs(end.x - nb.x) < 0.5;
        const wasHorizontal = Math.abs(end.y - nb.y) < 0.5;
        pts[iEnd] = translatePt(end, dx, dy);
        if (pts.length > 2) {
          if (wasVertical) pts[iNb] = { x: nb.x + dx, y: nb.y };
          else if (wasHorizontal) pts[iNb] = { x: nb.x, y: nb.y + dy };
        }
      };
      if (sMoved && pts.length >= 2) adjust(0, 1);
      if (eMoved && pts.length >= 2) adjust(pts.length - 1, pts.length - 2);
      return { ...e, points: pts };
    }
    return e;
  });
  return withElements(doc, elements);
}

/** Roterer valgte komponenter 90° (tekst og andre elementer roteres ikke). */
export function rotateElements(doc: DrawingDoc, ids: Set<string>, dir: 1 | -1 = 1): DrawingDoc {
  return withElements(
    doc,
    doc.elements.map((e) => (ids.has(e.id) && e.type === 'component' ? { ...e, rot: (((e.rot + dir * 90) % 360) + 360) % 360 } : e)),
  );
}

export function flipElements(doc: DrawingDoc, ids: Set<string>): DrawingDoc {
  return withElements(
    doc,
    doc.elements.map((e) => (ids.has(e.id) && e.type === 'component' ? { ...e, flip: !e.flip } : e)),
  );
}

/** Kopierer elementer med nye id-er. Ledninger beholder festene hvis komponenten også kopieres. */
export function cloneElements(els: Element[], existing: Element[], offset: number): Element[] {
  const idMap = new Map<string, string>();
  for (const e of els) idMap.set(e.id, uid(e.type === 'component' ? 'c' : e.type[0]));
  const all = [...existing];
  const out: Element[] = [];
  const mapRef = (w: WireEl, end: 'start' | 'end'): WireEl => {
    const r = w[end];
    if (!r) return w;
    const n = idMap.get(r.el);
    return n ? { ...w, [end]: { el: n, t: r.t } } : { ...w, [end]: undefined };
  };
  for (const e of els) {
    let c = translateEl(structuredClone(e), offset, offset);
    c = { ...c, id: idMap.get(e.id)! };
    if (c.type === 'component') {
      const def = getSymbol(c.symbolId);
      if (def?.prefix && c.label) {
        const isContact = !!CONTACT_PARENT[c.symbolId];
        if (!isContact) c = { ...c, label: nextLabel(def.prefix, all) };
      }
    }
    if (c.type === 'wire') {
      c = mapRef(mapRef(c, 'start'), 'end');
      // Endepunkter for ledninger som mister festet: bruk opprinnelig posisjon
    }
    all.push(c);
    out.push(c);
  }
  return out;
}

const PREFIX_ORDER = ['G', 'T', 'F', 'Q', 'S', 'B', 'K', 'E', 'P', 'R', 'M', 'X', 'W', ''];

/** Finner neste ledige plass i et rutenett (automatisk plassering). */
export function nextFreeSlot(doc: DrawingDoc, symbolId: string): Pt {
  const map = elementMap(doc.elements);
  const occupied = doc.elements.filter((e) => e.type === 'component').map((e) => elementBounds(e, map));
  const width = doc.sheet.show ? sheetSize(doc.sheet.size, doc.sheet.orientation).w - 200 : 1400;
  const stepX = 120;
  const stepY = 160;
  const def = getSymbol(symbolId);
  for (let row = 0; row < 40; row++) {
    for (let col = 0; col * stepX < width - 100; col++) {
      const p = { x: 160 + col * stepX, y: 180 + row * stepY };
      const b = def ? (typeof def.box === 'function' ? def.box(defaultProps(def)) : def.box) : { x: -20, y: -30, w: 40, h: 60 };
      const box = { x: p.x + b.x - 20, y: p.y + b.y - 20, w: b.w + 40, h: b.h + 40 };
      if (!occupied.some((o) => boxesIntersect(o, box))) return p;
    }
  }
  return { x: 160, y: 180 };
}

/** Ordner alle komponenter i rader etter type og betegnelse. Ledninger rutes på nytt. */
export function autoArrange(doc: DrawingDoc, grid: number): DrawingDoc {
  const comps = doc.elements.filter((e): e is ComponentEl => e.type === 'component');
  const sorted = [...comps].sort((a, b) => {
    const pa = PREFIX_ORDER.indexOf(getSymbol(a.symbolId)?.prefix ?? '');
    const pb = PREFIX_ORDER.indexOf(getSymbol(b.symbolId)?.prefix ?? '');
    if (pa !== pb) return pa - pb;
    return a.label.localeCompare(b.label, 'nb', { numeric: true });
  });
  const width = doc.sheet.show ? sheetSize(doc.sheet.size, doc.sheet.orientation).w - 260 : 1200;
  const perRow = Math.max(1, Math.floor(width / 140));
  const pos = new Map<string, Pt>();
  sorted.forEach((c, i) => {
    pos.set(c.id, { x: snapTo(180 + (i % perRow) * 140, grid), y: snapTo(200 + Math.floor(i / perRow) * 180, grid) });
  });
  const elements = doc.elements.map((e) => {
    if (e.type === 'component') {
      const p = pos.get(e.id)!;
      return { ...e, x: p.x, y: p.y, rot: 0 };
    }
    if (e.type === 'wire' && e.start && e.end && e.points.length >= 2) {
      return { ...e, points: [e.points[0], e.points[e.points.length - 1]] };
    }
    return e;
  });
  return withElements(doc, elements);
}

/** Legger inn knekkpunkt slik at ledningen går rettvinklet fra a til b. */
export function orthoPoints(a: Pt, b: Pt, verticalFirst: boolean): Pt[] {
  if (Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5) return [b];
  return verticalFirst ? [{ x: a.x, y: b.y }, b] : [{ x: b.x, y: a.y }, b];
}

/** Fjerner overflødige punkter (rette linjer og duplikater). */
export function simplifyPoints(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      const collinear = Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) < 0.5;
      if (collinear) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}
