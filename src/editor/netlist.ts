import type { ComponentEl, Element, Pt, WireEl } from '../types';
import { getSymbol } from '../library/symbols';
import { elementMap, onSegmentInterior, resolveWire, samePt, terminalsOf } from './geometry';

class UnionFind {
  private parent: number[] = [];
  private index = new Map<string, number>();
  id(key: string): number {
    let i = this.index.get(key);
    if (i === undefined) {
      i = this.parent.length;
      this.parent.push(i);
      this.index.set(key, i);
    }
    return i;
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: string, b: string) {
    const ra = this.find(this.id(a));
    const rb = this.find(this.id(b));
    if (ra !== rb) this.parent[ra] = rb;
  }
  root(key: string) {
    return this.find(this.id(key));
  }
  keys() {
    return [...this.index.keys()];
  }
}

export interface DanglingEnd {
  wireId: string;
  end: 'start' | 'end';
  pt: Pt;
}

export interface UnconnectedTerminal {
  elId: string;
  tid: string;
  name: string;
  pt: Pt;
}

export interface Netlist {
  /** `${elementId}:${terminalId}` → nettnummer */
  netOfTerminal: Map<string, number>;
  netOfWire: Map<string, number>;
  netCount: number;
  dangling: DanglingEnd[];
  unconnected: UnconnectedTerminal[];
  /** Ledninger som er festet til en terminal som ikke finnes lenger */
  brokenRefs: { wireId: string; end: 'start' | 'end' }[];
}

const tkey = (el: string, t: string) => `t:${el}:${t}`;
const wkey = (w: string) => `w:${w}`;

export function isElectricalWire(e: Element): e is WireEl {
  return e.type === 'wire' && e.kind === 'wire';
}

/**
 * Finner hvilke terminaler som henger sammen (nett) ut fra ledninger.
 * Ledninger kobles til terminaler de er festet til eller ender på, og til andre ledninger
 * når et endepunkt ligger på en annen ledning (T-kobling).
 */
export function buildNetlist(elements: Element[]): Netlist {
  const uf = new UnionFind();
  const map = elementMap(elements);
  const comps = elements.filter((e): e is ComponentEl => e.type === 'component' && (getSymbol(e.symbolId)?.terminals.length ?? 0) > 0);
  const wires = elements.filter(isElectricalWire);

  const terms: { key: string; elId: string; tid: string; name: string; pt: Pt; junction: boolean }[] = [];
  for (const c of comps) {
    const def = getSymbol(c.symbolId)!;
    for (const t of terminalsOf(c)) {
      const key = tkey(c.id, t.id);
      uf.id(key);
      terms.push({ key, elId: c.id, tid: t.id, name: t.name, pt: { x: t.x, y: t.y }, junction: def.id === 'junction' });
    }
    for (const [a, b] of def.bridges ?? []) uf.union(tkey(c.id, a), tkey(c.id, b));
  }

  // Terminaler som ligger oppå hverandre er direkte koblet
  const byPos = new Map<string, string[]>();
  for (const t of terms) {
    const k = `${Math.round(t.pt.x)},${Math.round(t.pt.y)}`;
    const list = byPos.get(k) ?? [];
    list.push(t.key);
    byPos.set(k, list);
  }
  for (const list of byPos.values()) for (let i = 1; i < list.length; i++) uf.union(list[0], list[i]);

  const resolved = new Map<string, Pt[]>();
  for (const w of wires) {
    resolved.set(w.id, resolveWire(w, map));
    uf.id(wkey(w.id));
  }

  const dangling: DanglingEnd[] = [];
  const brokenRefs: Netlist['brokenRefs'] = [];

  for (const w of wires) {
    const pts = resolved.get(w.id)!;
    if (pts.length < 2) continue;
    const ends: ['start' | 'end', Pt, typeof w.start][] = [
      ['start', pts[0], w.start],
      ['end', pts[pts.length - 1], w.end],
    ];
    for (const [which, pt, ref] of ends) {
      let connected = false;
      if (ref) {
        const c = map.get(ref.el);
        if (c?.type === 'component' && terminalsOf(c).some((t) => t.id === ref.t)) {
          uf.union(wkey(w.id), tkey(ref.el, ref.t));
          connected = true;
        } else brokenRefs.push({ wireId: w.id, end: which });
      }
      for (const t of terms) {
        if (samePt(t.pt, pt)) {
          uf.union(wkey(w.id), t.key);
          connected = true;
        }
      }
      for (const o of wires) {
        if (o.id === w.id) continue;
        const op = resolved.get(o.id)!;
        for (let i = 0; i < op.length; i++) {
          if (samePt(op[i], pt) || (i < op.length - 1 && onSegmentInterior(pt, op[i], op[i + 1]))) {
            uf.union(wkey(w.id), wkey(o.id));
            connected = true;
            break;
          }
        }
      }
      if (!connected) dangling.push({ wireId: w.id, end: which, pt });
    }
    // Koblingspunkt som ligger på ledningen kobles til den
    for (const t of terms) {
      if (!t.junction) continue;
      for (let i = 0; i < pts.length - 1; i++) {
        if (onSegmentInterior(t.pt, pts[i], pts[i + 1])) uf.union(wkey(w.id), t.key);
      }
    }
  }

  // Nummerer nett
  const rootToNet = new Map<number, number>();
  const netOf = (key: string) => {
    const r = uf.root(key);
    let n = rootToNet.get(r);
    if (n === undefined) {
      n = rootToNet.size;
      rootToNet.set(r, n);
    }
    return n;
  };
  const netOfTerminal = new Map<string, number>();
  for (const t of terms) netOfTerminal.set(`${t.elId}:${t.tid}`, netOf(t.key));
  const netOfWire = new Map<string, number>();
  for (const w of wires) netOfWire.set(w.id, netOf(wkey(w.id)));

  // Terminaler som ikke er koblet til noe annet enn egen komponent
  const netMembers = new Map<number, Set<string>>();
  for (const k of uf.keys()) {
    const n = netOf(k);
    const owner = k.startsWith('w:') ? k : k.split(':')[1];
    const s = netMembers.get(n) ?? new Set<string>();
    s.add(owner);
    netMembers.set(n, s);
  }
  const unconnected: UnconnectedTerminal[] = [];
  for (const t of terms) {
    if (t.junction) continue;
    const members = netMembers.get(netOfTerminal.get(`${t.elId}:${t.tid}`)!);
    if (!members || members.size <= 1) unconnected.push({ elId: t.elId, tid: t.tid, name: t.name, pt: t.pt });
  }

  return { netOfTerminal, netOfWire, netCount: rootToNet.size, dangling, unconnected, brokenRefs };
}

/** Punkter der det skal tegnes koblingsprikk (T-koblinger og 3+ ledningsender). */
export function junctionDots(elements: Element[]): Pt[] {
  const map = elementMap(elements);
  const wires = elements.filter(isElectricalWire).map((w) => resolveWire(w, map));
  const dots: Pt[] = [];
  const endCount = new Map<string, { pt: Pt; n: number }>();
  for (const pts of wires) {
    if (pts.length < 2) continue;
    for (const pt of [pts[0], pts[pts.length - 1]]) {
      const k = `${Math.round(pt.x)},${Math.round(pt.y)}`;
      const e = endCount.get(k) ?? { pt, n: 0 };
      e.n++;
      endCount.set(k, e);
      for (const o of wires) {
        if (o === pts) continue;
        for (let i = 0; i < o.length - 1; i++) {
          const innerVertex = i > 0 && samePt(pt, o[i]);
          if (innerVertex || onSegmentInterior(pt, o[i], o[i + 1])) {
            dots.push(pt);
            break;
          }
        }
      }
    }
  }
  for (const e of endCount.values()) if (e.n >= 3) dots.push(e.pt);
  return dots;
}
