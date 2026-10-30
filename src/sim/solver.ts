// Pedagogisk likestrømsimulator (idealisert modell).
// Løser kretsen med nodeanalyse. Brytere og ledere er nesten null ohm, åpne kontakter er brudd.
// Modellen er forenklet og erstatter IKKE praktisk testing, måling eller sikkerhetskontroll.

import type { ComponentEl, Element } from '../types';
import { getSymbol } from '../library/symbols';
import type { SimRole, SimVisual } from '../library/types';
import { buildNetlist, type Netlist } from '../editor/netlist';

export interface SimMessage {
  level: 'error' | 'warning' | 'info' | 'ok';
  text: string;
  elId?: string;
}

export interface TimerState {
  onSince?: number;
  offSince?: number;
}

export interface SimState {
  /** Overstyrt stilling for brytere: true = lukket (for vekselbryter: true = stilling 2) */
  switches: Record<string, boolean>;
  /** Trykknapper som holdes inne */
  pressed: Record<string, boolean>;
  /** Sikringer/automater som har løst ut */
  tripped: Record<string, boolean>;
  timers: Record<string, TimerState>;
  /** Spoletilstand fra forrige beregning (gir selvhold og hysterese) */
  coils?: Record<string, boolean>;
  /** Simulerte feil (for feilsøkingsoppgaver): komponent-id → feiltype */
  faults?: Record<string, 'brudd' | 'kortslutning'>;
}

export function emptySimState(): SimState {
  return { switches: {}, pressed: {}, tripped: {}, timers: {} };
}

export interface SimResult {
  netlist: Netlist;
  /** Spenning (V) per nett, relativt til referanse (0 V) */
  netVoltage: number[];
  visual: Record<string, SimVisual>;
  current: Record<string, number>;
  voltageAcross: Record<string, number>;
  power: Record<string, number>;
  messages: SimMessage[];
  closedCircuit: boolean;
  sourceCurrent: number;
  /** true hvis et tidsrelé teller – brukergrensesnittet må da oppdatere jevnlig */
  timersRunning: boolean;
  /** Nye utløste vern som bør lagres i SimState */
  tripped: Record<string, boolean>;
  /** Spoletilstand som bør lagres i SimState.coils til neste beregning */
  coils: Record<string, boolean>;
}

const G_CLOSED = 1e3; // 1 mΩ
const G_LEAK = 1e-9;

const n = (v: string | undefined, d: number) => {
  const x = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(x) && x !== 0 ? x : d;
};

function solveLinear(A: number[][], b: number[]): number[] | null {
  const N = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < N; c++) {
    let piv = c;
    for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-15) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < N; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f === 0) continue;
      for (let k = c; k <= N; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[N] / row[i]);
}

interface Comp {
  el: ComponentEl;
  role: SimRole;
  nets: Record<string, number>;
}

export function lampResistance(el: ComponentEl) {
  const U = n(el.props.U, 12);
  const P = n(el.props.P, 5);
  return (U * U) / P;
}

export function simulate(elements: Element[], state: SimState, now = Date.now()): SimResult {
  const netlist = buildNetlist(elements);
  const messages: SimMessage[] = [];
  const comps: Comp[] = [];
  for (const e of elements) {
    if (e.type !== 'component') continue;
    const def = getSymbol(e.symbolId);
    if (!def?.sim) continue;
    const nets: Record<string, number> = {};
    for (const t of def.terminals) {
      const nn = netlist.netOfTerminal.get(`${e.id}:${t.id}`);
      if (nn !== undefined) nets[t.id] = nn;
    }
    comps.push({ el: e, role: def.sim, nets });
  }
  const name = (c: ComponentEl) => c.label || getSymbol(c.symbolId)?.name || 'komponent';

  const sources = comps.filter((c) => c.role === 'source');
  const N = netlist.netCount;
  const netVoltage = new Array(N).fill(0);
  const visual: Record<string, SimVisual> = {};
  const current: Record<string, number> = {};
  const voltageAcross: Record<string, number> = {};
  const power: Record<string, number> = {};
  const tripped = { ...state.tripped };
  const faults = state.faults ?? {};

  if (sources.length === 0) {
    messages.push({ level: 'error', text: 'Kretsen mangler strømkilde. Legg til en strømkilde (likespenning).' });
  }

  // Referansenett: jordsymbol, ellers minuspolen på første kilde
  const refNets = new Set<number>();
  for (const c of comps) if (c.role === 'ground' && c.nets['1'] !== undefined) refNets.add(c.nets['1']);
  if (refNets.size === 0 && sources[0]?.nets['-'] !== undefined) refNets.add(sources[0].nets['-']);

  const unknowns: number[] = [];
  const idx = new Map<number, number>();
  for (let i = 0; i < N; i++) {
    if (!refNets.has(i)) {
      idx.set(i, unknowns.length);
      unknowns.push(i);
    }
  }

  // Spoler: label → aktiv (kontakter påvirket)
  const coils = comps.filter((c) => c.role === 'coil' || c.role === 'timer-on' || c.role === 'timer-off');
  const coilEnergized: Record<string, boolean> = { ...(state.coils ?? {}) };
  const ledOn: Record<string, boolean> = {};
  for (const c of comps) if (c.role === 'led') ledOn[c.el.id] = true;

  const timers = state.timers;
  let timersRunning = false;

  const labelActive = (label: string): boolean => {
    let active = false;
    for (const c of coils) {
      if (c.el.label !== label) continue;
      const on = !!coilEnergized[c.el.id];
      if (c.role === 'coil') active ||= on;
      else if (c.role === 'timer-on') {
        const t = timers[c.el.id] ?? {};
        const delay = n(c.el.props.t, 3) * 1000;
        if (on && t.onSince !== undefined) active ||= now - t.onSince >= delay;
      } else if (c.role === 'timer-off') {
        const t = timers[c.el.id] ?? {};
        const delay = n(c.el.props.t, 3) * 1000;
        active ||= on || (t.offSince !== undefined && now - t.offSince < delay);
      }
    }
    return active;
  };

  const isClosed = (c: Comp): boolean => {
    const id = c.el.id;
    if (faults[id] === 'brudd') return false;
    switch (c.role) {
      case 'switch':
        return state.switches[id] ?? (c.el.symbolId === 'switch-nc' ? c.el.props.state !== 'Åpen' : c.el.props.state === 'Lukket');
      case 'pushbutton':
        return c.el.symbolId === 'pushbutton-nc' ? !state.pressed[id] : !!state.pressed[id];
      case 'fuse':
        return !tripped[id];
      case 'breaker':
        return !tripped[id] && (state.switches[id] ?? c.el.props.state !== 'Av');
      case 'overload-nc':
        return !(state.switches[id] === false || (state.switches[id] === undefined && c.el.props.state === 'Ja'));
      case 'relay-no':
        return labelActive(c.el.label);
      case 'relay-nc':
        return !labelActive(c.el.label);
      default:
        return true;
    }
  };

  let V: number[] = new Array(unknowns.length).fill(0);
  let solved = false;

  for (let iter = 0; iter < 25; iter++) {
    const A = unknowns.map(() => new Array(unknowns.length).fill(0));
    const b = new Array(unknowns.length).fill(0);
    const stampG = (n1: number | undefined, n2: number | undefined, g: number) => {
      const i = n1 === undefined ? undefined : idx.get(n1);
      const j = n2 === undefined ? undefined : idx.get(n2);
      if (n1 === undefined || n2 === undefined) return;
      if (i !== undefined) A[i][i] += g;
      if (j !== undefined) A[j][j] += g;
      if (i !== undefined && j !== undefined) {
        A[i][j] -= g;
        A[j][i] -= g;
      }
    };
    const inject = (node: number | undefined, I: number) => {
      if (node === undefined) return;
      const i = idx.get(node);
      if (i !== undefined) b[i] += I;
    };

    for (const c of comps) {
      const nets = c.nets;
      const short = faults[c.el.id] === 'kortslutning';
      const broken = faults[c.el.id] === 'brudd';
      const two = (g: number) => {
        const ids = Object.keys(nets);
        const t = getSymbol(c.el.symbolId)!.terminals;
        if (t.length >= 2) stampG(nets[t[0].id], nets[t[1].id], short ? G_CLOSED : broken ? 0 : g);
        void ids;
      };
      switch (c.role) {
        case 'source': {
          const U = n(c.el.props.U, 12);
          const Ri = Math.max(0.01, n(c.el.props.Ri, 0.1));
          stampG(nets['+'], nets['-'], 1 / Ri);
          inject(nets['+'], U / Ri);
          inject(nets['-'], -U / Ri);
          break;
        }
        case 'resistor':
          two(1 / n(c.el.props.R, 100));
          break;
        case 'lamp':
          two(1 / lampResistance(c.el));
          break;
        case 'motor':
        case 'bell': {
          const U = n(c.el.props.U, 12);
          const P = n(c.el.props.P, 5);
          two(P / (U * U));
          break;
        }
        case 'coil':
        case 'timer-on':
        case 'timer-off':
          two(1 / n(c.el.props.Rc, 240));
          break;
        case 'switch':
        case 'pushbutton':
        case 'fuse':
        case 'breaker':
        case 'relay-no':
        case 'relay-nc':
        case 'overload-nc':
          if (isClosed(c) || short) two(G_CLOSED);
          break;
        case 'changeover': {
          const pos2 = state.switches[c.el.id] ?? c.el.props.pos === '2';
          if (!broken) stampG(nets['C'], nets[pos2 ? '2' : '1'], G_CLOSED);
          break;
        }
        case 'led': {
          if (broken) break;
          if (short) {
            stampG(nets['A'], nets['K'], G_CLOSED);
            break;
          }
          const Uf = n(c.el.props.Uf, 2);
          if (ledOn[c.el.id]) {
            const g = 1 / 5;
            stampG(nets['A'], nets['K'], g);
            inject(nets['A'], g * Uf);
            inject(nets['K'], -g * Uf);
          }
          break;
        }
        default:
          break;
      }
    }
    for (let i = 0; i < unknowns.length; i++) A[i][i] += G_LEAK;

    const sol = unknowns.length ? solveLinear(A, b) : [];
    if (!sol) break;
    V = sol;
    solved = true;
    const volt = (net: number | undefined) => (net === undefined ? NaN : refNets.has(net) ? 0 : V[idx.get(net)!]);

    // Oppdater tilstander og se om noe endret seg
    let changed = false;
    for (const c of comps) {
      if (c.role === 'led') {
        const va = volt(c.nets['A']);
        const vk = volt(c.nets['K']);
        const Uf = n(c.el.props.Uf, 2);
        const on = ledOn[c.el.id];
        if (on && (va - vk - Uf) / 5 < -1e-9) {
          ledOn[c.el.id] = false;
          changed = true;
        } else if (!on && va - vk > Uf + 1e-6) {
          ledOn[c.el.id] = true;
          changed = true;
        }
      }
      if (c.role === 'coil' || c.role === 'timer-on' || c.role === 'timer-off') {
        const u = Math.abs(volt(c.nets['A1']) - volt(c.nets['A2']));
        const en = Number.isFinite(u) && u >= 0.7 * n(c.el.props.Uc, 12);
        if (!!coilEnergized[c.el.id] !== en) {
          coilEnergized[c.el.id] = en;
          changed = true;
        }
      }
      if ((c.role === 'fuse' || c.role === 'breaker') && isClosed(c)) {
        const I = Math.abs(volt(c.nets['1']) - volt(c.nets['2'])) * G_CLOSED;
        if (I > n(c.el.props.In, 10) * 1.0001) {
          tripped[c.el.id] = true;
          changed = true;
          messages.push({ level: 'warning', text: `${name(c.el)} har løst ut fordi strømmen (${I.toFixed(2)} A) var større enn merkestrømmen.`, elId: c.el.id });
        }
      }
    }
    if (!changed) break;
  }

  // Oppdater tidsrelé-tilstand
  for (const c of coils) {
    if (c.role === 'coil') continue;
    const t = (timers[c.el.id] ??= {});
    const on = !!coilEnergized[c.el.id];
    if (on) {
      if (t.onSince === undefined) t.onSince = now;
      t.offSince = undefined;
    } else {
      if (t.onSince !== undefined) t.offSince = now;
      t.onSince = undefined;
    }
    const delay = n(c.el.props.t, 3) * 1000;
    if (c.role === 'timer-on' && on && now - (t.onSince ?? now) < delay) timersRunning = true;
    if (c.role === 'timer-off' && !on && t.offSince !== undefined && now - t.offSince < delay) timersRunning = true;
  }

  const volt = (net: number | undefined) => (net === undefined ? NaN : refNets.has(net) ? 0 : solved ? V[idx.get(net)!] : 0);
  for (let i = 0; i < N; i++) netVoltage[i] = volt(i);

  let sourceCurrent = 0;
  for (const c of comps) {
    const t = getSymbol(c.el.symbolId)!.terminals;
    const v1 = t[0] ? volt(c.nets[t[0].id]) : NaN;
    const v2 = t[1] ? volt(c.nets[t[1].id]) : NaN;
    const u = v1 - v2;
    const id = c.el.id;
    const short = faults[id] === 'kortslutning';
    switch (c.role) {
      case 'source': {
        const U = n(c.el.props.U, 12);
        const Ri = Math.max(0.01, n(c.el.props.Ri, 0.1));
        const I = (U - u) / Ri;
        current[id] = I;
        voltageAcross[id] = u;
        power[id] = U * I;
        sourceCurrent += Math.abs(I);
        if (Math.abs(I) > 0.8 * (U / Ri) && U / Ri > 1) {
          messages.push({ level: 'error', text: `Kortslutning ved ${name(c.el)}! Strømmen (${I.toFixed(1)} A) begrenses bare av kildens indre resistans.`, elId: id });
        }
        break;
      }
      case 'resistor':
      case 'lamp':
      case 'motor':
      case 'bell':
      case 'coil':
      case 'timer-on':
      case 'timer-off': {
        let R = 1;
        if (c.role === 'resistor') R = n(c.el.props.R, 100);
        else if (c.role === 'lamp') R = lampResistance(c.el);
        else if (c.role === 'motor' || c.role === 'bell') R = n(c.el.props.U, 12) ** 2 / n(c.el.props.P, 5);
        else R = n(c.el.props.Rc, 240);
        const I = faults[id] === 'brudd' ? 0 : short ? 0 : u / R;
        current[id] = Number.isFinite(I) ? I : 0;
        voltageAcross[id] = Number.isFinite(u) ? u : 0;
        power[id] = Math.abs(current[id] * voltageAcross[id]);
        if (c.role === 'lamp') {
          const Pr = n(c.el.props.P, 5);
          visual[id] = { level: Math.min(1, power[id] / Pr) };
          if (power[id] > Pr * 1.3) messages.push({ level: 'warning', text: `${name(c.el)} får ${power[id].toFixed(1)} W, mer enn merkeeffekten (${Pr} W). I virkeligheten kan lampen bli ødelagt.`, elId: id });
        } else if (c.role === 'motor' || c.role === 'bell') {
          const Pr = n(c.el.props.P, 5);
          visual[id] = { level: power[id] > Pr * 0.2 ? Math.min(1, power[id] / Pr) : 0 };
        } else if (c.role !== 'resistor') {
          visual[id] = { energized: !!coilEnergized[id] };
        } else {
          const Pmax = n(c.el.props.P, 0.25);
          if (power[id] > Pmax) messages.push({ level: 'warning', text: `${name(c.el)} avgir ${power[id].toFixed(2)} W, mer enn effekttåleevnen (${Pmax} W).`, elId: id });
        }
        break;
      }
      case 'led': {
        const va = volt(c.nets['A']);
        const vk = volt(c.nets['K']);
        const Uf = n(c.el.props.Uf, 2);
        const I = ledOn[id] && !short && faults[id] !== 'brudd' ? Math.max(0, (va - vk - Uf) / 5) : 0;
        const If = n(c.el.props.If, 20) / 1000;
        current[id] = I;
        voltageAcross[id] = va - vk;
        power[id] = I * (va - vk);
        visual[id] = { level: Math.min(1, I / If) };
        if (I > If * 1.5) messages.push({ level: 'warning', text: `${name(c.el)} får ${(I * 1000).toFixed(0)} mA – mye mer enn merkestrømmen (${If * 1000} mA). Mangler det formotstand?`, elId: id });
        if (va - vk < -0.5) messages.push({ level: 'info', text: `${name(c.el)} står i sperreretning og lyser ikke. Snu LED-en (anode mot pluss).`, elId: id });
        break;
      }
      case 'switch':
      case 'pushbutton':
      case 'fuse':
      case 'breaker':
      case 'relay-no':
      case 'relay-nc':
      case 'overload-nc': {
        const closed = isClosed(c);
        visual[id] = { closed, blown: !!tripped[id] };
        current[id] = closed ? u * G_CLOSED : 0;
        voltageAcross[id] = Number.isFinite(u) ? u : 0;
        break;
      }
      case 'changeover': {
        const pos2 = state.switches[id] ?? c.el.props.pos === '2';
        visual[id] = { closed: pos2 };
        break;
      }
      default:
        break;
    }
  }

  // Diagnostikk
  for (const d of netlist.dangling) messages.push({ level: 'warning', text: 'En ledning har en løs ende som ikke er koblet til noe.', elId: d.wireId });
  for (const u of netlist.unconnected) {
    const el = elements.find((e) => e.id === u.elId) as ComponentEl | undefined;
    if (!el) continue;
    const def = getSymbol(el.symbolId);
    if (def?.sim === 'ground' || def?.sim === 'conductor') continue;
    messages.push({ level: 'warning', text: `Terminal ${u.name || u.tid} på ${name(el)} er ikke tilkoblet.`, elId: el.id });
  }
  for (const c of comps) {
    if ((c.role === 'relay-no' || c.role === 'relay-nc') && !coils.some((k) => k.el.label === c.el.label)) {
      messages.push({ level: 'warning', text: `Kontakten ${c.el.label || '(uten betegnelse)'} har ingen spole med samme betegnelse.`, elId: c.el.id });
    }
  }
  if (sources.length > 0) {
    if (sourceCurrent > 1e-6) messages.unshift({ level: 'ok', text: `Lukket krets – det går strøm. Strøm fra kilden: ${sourceCurrent < 1 ? (sourceCurrent * 1000).toFixed(1) + ' mA' : sourceCurrent.toFixed(3) + ' A'}.` });
    else messages.unshift({ level: 'info', text: 'Åpen krets – det går ingen strøm fra kilden.' });
  }

  return {
    netlist,
    netVoltage,
    visual,
    current,
    voltageAcross,
    power,
    messages,
    closedCircuit: sourceCurrent > 1e-6,
    sourceCurrent,
    timersRunning,
    tripped,
    coils: coilEnergized,
  };
}
