// Hjelpefunksjoner for å bygge små kretser i kode (brukes i læringsmodulene).
import type { ComponentEl, Element, Pt, TextEl, WireEl } from '../../types';
import { defaultProps, getSymbol } from '../../library/symbols';
import { terminalPos } from '../../editor/geometry';
import { uid } from '../../utils/id';

export function comp(symbolId: string, x: number, y: number, label = '', props: Record<string, string> = {}, rot = 0): ComponentEl {
  const def = getSymbol(symbolId);
  if (!def) throw new Error(`Ukjent symbol: ${symbolId}`);
  return {
    id: uid('c'),
    type: 'component',
    symbolId,
    x,
    y,
    rot,
    label,
    props: { ...defaultProps(def), ...props },
  };
}

function tp(c: ComponentEl, t: string): Pt {
  const p = terminalPos(c, t);
  if (!p) throw new Error(`Terminal ${t} finnes ikke på ${c.symbolId}`);
  return { x: p.x, y: p.y };
}

/** Ledning mellom to terminaler, med valgfrie knekkpunkter. */
export function wire(a: ComponentEl, ta: string, b: ComponentEl, tb: string, via: Pt[] = []): WireEl {
  return {
    id: uid('w'),
    type: 'wire',
    kind: 'wire',
    points: [tp(a, ta), ...via, tp(b, tb)],
    start: { el: a.id, t: ta },
    end: { el: b.id, t: tb },
    lineStyle: 'solid',
    width: 2,
  };
}

/** Ledning fra en terminal til et fritt punkt (f.eks. et punkt på en annen ledning = T-kobling). */
export function wireTo(a: ComponentEl, ta: string, via: Pt[], end: Pt): WireEl {
  return {
    id: uid('w'),
    type: 'wire',
    kind: 'wire',
    points: [tp(a, ta), ...via, end],
    start: { el: a.id, t: ta },
    lineStyle: 'solid',
    width: 2,
  };
}

/** Fri ledning mellom punkter (endene kobles til ledninger de ligger på). */
export function line(points: Pt[]): WireEl {
  return { id: uid('w'), type: 'wire', kind: 'wire', points, lineStyle: 'solid', width: 2 };
}

export function label(x: number, y: number, text: string, size = 11): TextEl {
  return { id: uid('t'), type: 'text', x, y, text, size, variant: 'text' };
}

export interface Circuit {
  elements: Element[];
  /** Komponenter etter betegnelse */
  c: Record<string, ComponentEl>;
}

function circuit(parts: ComponentEl[], rest: Element[]): Circuit {
  const c: Record<string, ComponentEl> = {};
  for (const p of parts) if (p.label) c[p.label] = p;
  return { elements: [...parts, ...rest], c };
}

// ---------------------------------------------------------------------------
// Ferdige kretser
// ---------------------------------------------------------------------------

/** G1 – S1 – E1 – E2 i serie. */
export function seriesTwoLamps(s1Closed: boolean, opts: { fuse?: boolean } = {}): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: '12' });
  const S1 = comp('switch-no', 100, 40, 'S1', { state: s1Closed ? 'Lukket' : 'Åpen' }, 270);
  const parts = [G1, S1];
  const wires: Element[] = [];
  let prev: [ComponentEl, string] = [S1, '2'];
  if (opts.fuse) {
    const F1 = comp('fuse', 200, 40, 'F1', { In: '2' }, 270);
    parts.push(F1);
    wires.push(wire(S1, '2', F1, '1'));
    prev = [F1, '2'];
  }
  const xE1 = opts.fuse ? 300 : 200;
  const E1 = comp('lamp', xE1, 40, 'E1', {}, 270);
  const E2 = comp('lamp', xE1 + 100, 100, 'E2');
  parts.push(E1, E2);
  wires.push(
    wire(G1, '+', S1, '1', [{ x: 0, y: 40 }]),
    wire(prev[0], prev[1], E1, '1'),
    wire(E1, '2', E2, '1', [{ x: xE1 + 100, y: 40 }]),
    wire(E2, '2', G1, '-', [
      { x: xE1 + 100, y: 160 },
      { x: 0, y: 160 },
    ]),
  );
  return circuit(parts, wires);
}

/** G1 – S1 (hoved) – E1 parallelt med (S2 – E2). */
export function parallelWithBranchSwitch(s1Closed: boolean, s2Closed: boolean): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: '12' });
  const S1 = comp('switch-no', 100, 40, 'S1', { state: s1Closed ? 'Lukket' : 'Åpen' }, 270);
  const E1 = comp('lamp', 200, 100, 'E1');
  const S2 = comp('switch-no', 300, 70, 'S2', { state: s2Closed ? 'Lukket' : 'Åpen' });
  const E2 = comp('lamp', 300, 160, 'E2');
  return circuit(
    [G1, S1, E1, S2, E2],
    [
      wire(G1, '+', S1, '1', [{ x: 0, y: 40 }]),
      wire(S1, '2', S2, '1'),
      wireTo(E1, '1', [], { x: 200, y: 40 }),
      wire(S2, '2', E2, '1'),
      wire(E2, '2', G1, '-', [
        { x: 300, y: 220 },
        { x: 0, y: 220 },
      ]),
      wireTo(E1, '2', [], { x: 200, y: 220 }),
    ],
  );
}

/** Trappekobling: to vekselbrytere og én lampe. */
export function stairCircuit(s1pos: '1' | '2', s2pos: '1' | '2'): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: '12' });
  const S1 = comp('changeover', 100, 40, 'S1', { pos: s1pos }, 90);
  const S2 = comp('changeover', 220, 40, 'S2', { pos: s2pos }, 270);
  const E1 = comp('lamp', 300, 100, 'E1');
  return circuit(
    [G1, S1, S2, E1],
    [
      wire(G1, '+', S1, 'C', [{ x: 0, y: 40 }]),
      wire(S1, '1', S2, '2'),
      wire(S1, '2', S2, '1'),
      wire(S2, 'C', E1, '1', [{ x: 300, y: 40 }]),
      wire(E1, '2', G1, '-', [
        { x: 300, y: 160 },
        { x: 0, y: 160 },
      ]),
    ],
  );
}

/** Styrekrets med relé: S1 styrer spolen K1, kontakten K1 styrer E1 (egen kilde G2). */
export function relayCircuit(s1Closed: boolean, contact: 'relay-no' | 'relay-nc' = 'relay-no'): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: '12' });
  const S1 = comp('switch-no', 100, 40, 'S1', { state: s1Closed ? 'Lukket' : 'Åpen' }, 270);
  const K1 = comp('relay-coil', 200, 100, 'K1', { Uc: '12' });
  const G2 = comp('dc-source', 320, 100, 'G2', { U: '12' });
  const K1c = comp(contact, 420, 40, 'K1', {}, 270);
  const E1 = comp('lamp', 520, 100, 'E1');
  const parts = [G1, S1, K1, G2, K1c, E1];
  const c: Record<string, ComponentEl> = { G1, S1, K1, G2, E1, K1c };
  return {
    c,
    elements: [
      ...parts,
      wire(G1, '+', S1, '1', [{ x: 0, y: 40 }]),
      wire(S1, '2', K1, 'A1', [{ x: 200, y: 40 }]),
      wire(K1, 'A2', G1, '-', [
        { x: 200, y: 160 },
        { x: 0, y: 160 },
      ]),
      wire(G2, '+', K1c, '1', [{ x: 320, y: 40 }]),
      wire(K1c, '2', E1, '1', [{ x: 520, y: 40 }]),
      wire(E1, '2', G2, '-', [
        { x: 520, y: 160 },
        { x: 320, y: 160 },
      ]),
    ],
  };
}

/** G1 – S1 – F1 – E1, E2, E3 i parallell. */
export function parallelThreeLamps(): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: '12' });
  const S1 = comp('switch-no', 100, 40, 'S1', { state: 'Lukket' }, 270);
  const F1 = comp('fuse', 200, 40, 'F1', { In: '2' }, 270);
  const E1 = comp('lamp', 300, 100, 'E1');
  const E2 = comp('lamp', 400, 100, 'E2');
  const E3 = comp('lamp', 500, 100, 'E3');
  return circuit(
    [G1, S1, F1, E1, E2, E3],
    [
      wire(G1, '+', S1, '1', [{ x: 0, y: 40 }]),
      wire(S1, '2', F1, '1'),
      wireTo(F1, '2', [], { x: 500, y: 40 }),
      wireTo(E1, '1', [], { x: 300, y: 40 }),
      wireTo(E2, '1', [], { x: 400, y: 40 }),
      wireTo(E3, '1', [], { x: 500, y: 40 }),
      wire(G1, '-', E3, '2', [
        { x: 0, y: 160 },
        { x: 500, y: 160 },
      ]),
      wireTo(E1, '2', [], { x: 300, y: 160 }),
      wireTo(E2, '2', [], { x: 400, y: 160 }),
    ],
  );
}

/** G1 – S1 – R1 – P1 (LED med formotstand). */
export function ledCircuit(): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: '12' });
  const S1 = comp('switch-no', 100, 40, 'S1', { state: 'Lukket' }, 270);
  const R1 = comp('resistor', 200, 40, 'R1', { R: '470' }, 270);
  const P1 = comp('led', 300, 100, 'P1');
  return circuit(
    [G1, S1, R1, P1],
    [
      wire(G1, '+', S1, '1', [{ x: 0, y: 40 }]),
      wire(S1, '2', R1, '1'),
      wire(R1, '2', P1, 'A', [{ x: 300, y: 40 }]),
      wire(P1, 'K', G1, '-', [
        { x: 300, y: 160 },
        { x: 0, y: 160 },
      ]),
    ],
  );
}

/** Motstandsnettverk for regneoppgaver. */
export function resistorNetwork(kind: 'serie' | 'parallell' | 'blandet', values: number[], U: number): Circuit {
  const G1 = comp('dc-source', 0, 100, 'G1', { U: String(U) });
  const parts: ComponentEl[] = [G1];
  const wires: Element[] = [];
  const R = values.map((v, i) => `R${i + 1}`);
  if (kind === 'serie') {
    const rs = values.map((v, i) => comp('resistor', 100 + i * 100, 40, R[i], { R: String(v) }, 270));
    parts.push(...rs);
    wires.push(wire(G1, '+', rs[0], '1', [{ x: 0, y: 40 }]));
    for (let i = 1; i < rs.length; i++) wires.push(wire(rs[i - 1], '2', rs[i], '1'));
    const last = rs[rs.length - 1];
    const lx = last.x + 30;
    wires.push(
      wire(last, '2', G1, '-', [
        { x: lx + 30, y: 40 },
        { x: lx + 30, y: 160 },
        { x: 0, y: 160 },
      ]),
    );
  } else if (kind === 'parallell') {
    const rs = values.map((v, i) => comp('resistor', 100 + i * 100, 100, R[i], { R: String(v) }));
    parts.push(...rs);
    const lastX = rs[rs.length - 1].x;
    wires.push(line([{ x: 0, y: 40 }, { x: lastX, y: 40 }]));
    wires.push(wireTo(G1, '+', [], { x: 0, y: 40 }));
    wires.push(line([{ x: 0, y: 160 }, { x: lastX, y: 160 }]));
    wires.push(wireTo(G1, '-', [], { x: 0, y: 160 }));
    for (const r of rs) {
      wires.push(wireTo(r, '1', [], { x: r.x, y: 40 }));
      wires.push(wireTo(r, '2', [], { x: r.x, y: 160 }));
    }
  } else {
    // R1 i serie med (R2 || R3)
    const r1 = comp('resistor', 100, 40, R[0], { R: String(values[0]) }, 270);
    const r2 = comp('resistor', 220, 100, R[1], { R: String(values[1]) });
    const r3 = comp('resistor', 320, 100, R[2], { R: String(values[2]) });
    parts.push(r1, r2, r3);
    wires.push(
      wire(G1, '+', r1, '1', [{ x: 0, y: 40 }]),
      wire(r1, '2', r3, '1', [{ x: 320, y: 40 }]),
      wireTo(r2, '1', [], { x: 220, y: 40 }),
      wire(G1, '-', r3, '2', [
        { x: 0, y: 160 },
        { x: 320, y: 160 },
      ]),
      wireTo(r2, '2', [], { x: 220, y: 160 }),
    );
  }
  return circuit(parts, wires);
}

/** Styrestrømkrets for start/stopp med selvhold (kun for visning; logikken regnes i modulen). */
export function selfHoldCircuit(): Circuit {
  const Xp = comp('connection-point', 100, -10, '', { tekst: '+24 V' });
  const F2 = comp('overload-nc', 100, 60, 'F2');
  const S1 = comp('pushbutton-nc', 100, 150, 'S1');
  const S2 = comp('pushbutton-no', 100, 240, 'S2');
  const Q1a = comp('relay-no', 200, 240, 'Q1');
  const Q1 = comp('contactor-coil', 100, 340, 'Q1');
  const P1 = comp('lamp', 200, 340, 'P1', { U: '24', P: '2' });
  // Rotert 180° slik at sirkelen havner under ledningen; teksten legges som egen etikett
  const X0 = comp('connection-point', 100, 410, '', { tekst: '' }, 180);
  const parts = [Xp, F2, S1, S2, Q1a, Q1, P1, X0];
  return {
    c: { F2, S1, S2, Q1a, Q1, P1 },
    elements: [
      ...parts,
      wire(Xp, '1', F2, '1'),
      wire(F2, '2', S1, '1'),
      wire(S1, '2', S2, '1'),
      wireTo(Q1a, '1', [{ x: 200, y: 195 }], { x: 100, y: 195 }),
      wire(S2, '2', Q1, 'A1'),
      wire(Q1a, '2', P1, '1'),
      line([
        { x: 100, y: 290 },
        { x: 200, y: 290 },
      ]),
      wire(Q1, 'A2', X0, '1'),
      wireTo(P1, '2', [{ x: 200, y: 385 }], { x: 100, y: 385 }),
      label(24, 154, 'STOPP', 10),
      label(24, 244, 'START', 10),
      label(208, 378, 'Drift', 10),
      label(110, 414, '0 V', 10),
    ],
  };
}
