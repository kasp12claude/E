import type { ComponentEl, Element, Pt, WireEl } from '../types';
import { symbolScale, type Box } from '../library/types';
import { getSymbol, symbolBox } from '../library/symbols';

export const snapTo = (v: number, g: number) => Math.round(v / g) * g;
export const snapPt = (p: Pt, g: number): Pt => ({ x: snapTo(p.x, g), y: snapTo(p.y, g) });
export const samePt = (a: Pt, b: Pt, tol = 0.5) => Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Roterer/speiler et lokalt punkt rundt komponentens senter. */
export function transformLocal(p: Pt, rot: number, flip?: boolean): Pt {
  let x = flip ? -p.x : p.x;
  let y = p.y;
  const r = ((rot % 360) + 360) % 360;
  if (r === 90) [x, y] = [-y, x];
  else if (r === 180) [x, y] = [-x, -y];
  else if (r === 270) [x, y] = [y, -x];
  return { x, y };
}

export function componentTransform(el: ComponentEl): string {
  const s = symbolScale(getSymbol(el.symbolId));
  return `translate(${el.x} ${el.y}) rotate(${el.rot})${s !== 1 ? ` scale(${s})` : ''}${el.flip ? ' scale(-1 1)' : ''}`;
}

export interface WorldTerminal {
  id: string;
  x: number;
  y: number;
  name: string;
  /** Lokal retning ut fra komponenten (brukes til ruting) */
  vertical: boolean;
}

export function terminalsOf(el: ComponentEl): WorldTerminal[] {
  const def = getSymbol(el.symbolId);
  if (!def) return [];
  return def.terminals.map((t) => {
    const w = transformLocal(t, el.rot, el.flip);
    const localVertical = Math.abs(t.y) >= Math.abs(t.x);
    const r = ((el.rot % 360) + 360) % 360;
    const vertical = r === 90 || r === 270 ? !localVertical : localVertical;
    return { id: t.id, x: el.x + w.x, y: el.y + w.y, name: el.terminalNumbers?.[t.id] ?? t.name, vertical };
  });
}

export function terminalPos(el: ComponentEl, tid: string): WorldTerminal | undefined {
  return terminalsOf(el).find((t) => t.id === tid);
}

export type ElementMap = Map<string, Element>;

export function elementMap(elements: Element[]): ElementMap {
  return new Map(elements.map((e) => [e.id, e]));
}

/** Faktiske punkter for en ledning – endepunkter følger terminalene de er festet til. */
export function resolveWire(w: WireEl, map: ElementMap): Pt[] {
  const pts = w.points.map((p) => ({ ...p }));
  if (pts.length === 0) return pts;
  let startVertical: boolean | undefined;
  if (w.start) {
    const c = map.get(w.start.el);
    if (c?.type === 'component') {
      const t = terminalPos(c, w.start.t);
      if (t) {
        pts[0] = { x: t.x, y: t.y };
        startVertical = t.vertical;
      }
    }
  }
  if (w.end) {
    const c = map.get(w.end.el);
    if (c?.type === 'component') {
      const t = terminalPos(c, w.end.t);
      if (t) pts[pts.length - 1] = { x: t.x, y: t.y };
    }
  }
  // Rett ledning mellom to punkter som ikke ligger på linje: legg inn et knekkpunkt
  if (w.kind === 'wire' && pts.length === 2) {
    const [a, b] = pts;
    if (Math.abs(a.x - b.x) > 0.5 && Math.abs(a.y - b.y) > 0.5) {
      const elbow = startVertical === false ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
      return [a, elbow, b];
    }
  }
  return pts;
}

export function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distToPolyline(p: Pt, pts: Pt[]): number {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distToSeg(p, pts[i], pts[i + 1]));
  return d;
}

/** Ligger p på linjestykket (ikke i endepunktene)? */
export function onSegmentInterior(p: Pt, a: Pt, b: Pt, tol = 0.5): boolean {
  if (samePt(p, a, tol) || samePt(p, b, tol)) return false;
  return distToSeg(p, a, b) <= tol;
}

export function polylineLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += dist(pts[i], pts[i + 1]);
  return l;
}

function boxOfPoints(pts: Pt[], pad = 0): Box {
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let x1 = Infinity,
    y1 = Infinity,
    x2 = -Infinity,
    y2 = -Infinity;
  for (const p of pts) {
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x);
    y2 = Math.max(y2, p.y);
  }
  return { x: x1 - pad, y: y1 - pad, w: x2 - x1 + pad * 2, h: y2 - y1 + pad * 2 };
}

export function textSize(text: string, size: number) {
  const lines = text.split('\n');
  const w = Math.max(10, ...lines.map((l) => l.length)) * size * 0.56;
  return { w, h: lines.length * size * 1.3 };
}

export function elementBounds(el: Element, map: ElementMap): Box {
  switch (el.type) {
    case 'component': {
      const def = getSymbol(el.symbolId);
      const b0 = def ? symbolBox(def, el.props) : { x: -10, y: -10, w: 20, h: 20 };
      const sc = symbolScale(def);
      const b = { x: b0.x * sc, y: b0.y * sc, w: b0.w * sc, h: b0.h * sc };
      const corners = [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x, y: b.y + b.h },
        { x: b.x + b.w, y: b.y + b.h },
      ].map((p) => {
        const t = transformLocal(p, el.rot, el.flip);
        return { x: el.x + t.x, y: el.y + t.y };
      });
      return boxOfPoints(corners);
    }
    case 'text': {
      const s = textSize(el.text, el.size);
      return { x: el.x, y: el.y - el.size, w: s.w, h: s.h };
    }
    case 'wire':
      return boxOfPoints(resolveWire(el, map), 3);
    case 'wall':
      return boxOfPoints(el.points, el.thickness / 2);
    case 'dimension':
      return boxOfPoints([el.a, el.b, ...dimensionPoints(el.a, el.b, el.offset)], 6);
    case 'rect':
      return { x: Math.min(el.x, el.x + el.w), y: Math.min(el.y, el.y + el.h), w: Math.abs(el.w), h: Math.abs(el.h) };
  }
}

export function boxesIntersect(a: Box, b: Box) {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}

export function unionBoxes(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const pts = boxes.flatMap((b) => [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
  ]);
  return boxOfPoints(pts);
}

export function contentBounds(elements: Element[]): Box | null {
  const map = elementMap(elements);
  return unionBoxes(elements.map((e) => elementBounds(e, map)));
}

/** Punktene for målsetting forskjøvet vinkelrett med offset */
export function dimensionPoints(a: Pt, b: Pt, offset: number): [Pt, Pt] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [
    { x: a.x + nx * offset, y: a.y + ny * offset },
    { x: b.x + nx * offset, y: b.y + ny * offset },
  ];
}

/** Arkstørrelse i tegneenheter (4 enheter per mm). */
export function sheetSize(size: 'A4' | 'A3', orientation: 'landscape' | 'portrait') {
  const mm = size === 'A3' ? [420, 297] : [297, 210];
  const [w, h] = orientation === 'landscape' ? mm : [mm[1], mm[0]];
  return { w: w * 4, h: h * 4 };
}
