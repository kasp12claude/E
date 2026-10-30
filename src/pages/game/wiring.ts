// Koblingsmodell for Elektrikerspillet.
//
// I koblingsboksen kommer det inn kabler (fra sikringsskapet, til brytere, lamper, stikkontakter …).
// Hver kabel har fargede ledere som allerede er koblet til et utstyr i den andre enden. Spilleren
// skjøter lederendene i boksen. Koblingen vurderes etter hvordan kretsen faktisk virker i alle
// bryterstillinger – ikke etter om den «ser riktig ut».
//
// Spillet er pedagogisk og forenklet. Det erstatter ikke opplæring, gjeldende regelverk eller
// produsentens monteringsanvisning.
import type { CircuitKind, Net } from './levels';

/** En forbindelse mellom to lederender, f.eks. «S.br|B.br» (alltid sortert) */
export const conn = (a: string, b: string) => [a, b].sort().join('|');

export interface CircuitSpec {
  kind: CircuitKind;
  net: Net;
}

export type WireColor = 'br' | 'bl' | 'gg' | 'sv' | 'gr';

export const COLOR_NAME: Record<WireColor, string> = {
  br: 'brun',
  bl: 'blå',
  gg: 'gul/grønn',
  sv: 'svart',
  gr: 'grå',
};

export const COLOR_HEX: Record<WireColor, string> = {
  br: '#92400e',
  bl: '#2563eb',
  gg: '#84cc16',
  sv: '#111827',
  gr: '#9ca3af',
};

type ControlKind = 'enpolet' | 'topolet' | 'veksel' | 'krone' | 'dimmer' | 'pir';

export interface ControlDef {
  id: string;
  kind: ControlKind;
  name: string;
  /** Antall stillinger: bryter 2, kronebryter 4, dimmer 4 (av/33/67/100 %), sensor 2 (ingen/bevegelse) */
  states: number;
  /** Hvilken veggplassering i rommet: hovedbryter, andre bryter (trapp) eller sensor høyt på vegg */
  mount: 'switch' | 'switch2' | 'sensor';
}

export interface LoadDef {
  id: string;
  kind: 'lampe' | 'stikk';
  name: string;
  /** Plassering: lampe i taket (indeks for flere lamper) eller stikkontakt på vegg */
  mount: 'lamp0' | 'lamp1' | 'socket0' | 'socket1';
}

export interface CableDef {
  /** Kort id, brukes i lederend-id: `${id}.${farge}` */
  id: string;
  label: string;
  conductors: { color: WireColor; term: string; role: string }[];
}

interface Template {
  name: string;
  info: string;
  controls: ControlDef[];
  loads: LoadDef[];
  cables: CableDef[];
  correct: string[];
}

// ---------------------------------------------------------------------------
// Kabler som går igjen
// ---------------------------------------------------------------------------
const supply = (net: Net): CableDef => ({
  id: 'S',
  label: 'Fra sikringsskap',
  conductors:
    net === 'IT'
      ? [
          { color: 'br', term: 'S.L', role: 'fase L1' },
          { color: 'bl', term: 'S.N', role: 'fase L2 (i IT-anlegg er den blå lederen en fase)' },
          { color: 'gg', term: 'S.PE', role: 'jord PE' },
        ]
      : [
          { color: 'br', term: 'S.L', role: 'fase L' },
          { color: 'bl', term: 'S.N', role: 'nøytral N' },
          { color: 'gg', term: 'S.PE', role: 'jord PE' },
        ],
});

const lampCable = (id: string, lamp: string, label: string): CableDef => ({
  id,
  label,
  conductors: [
    { color: 'br', term: `${lamp}.L`, role: `til lampens L` },
    { color: 'bl', term: `${lamp}.N`, role: `til lampens N` },
    { color: 'gg', term: `${lamp}.PE`, role: `til lampens jord` },
  ],
});

const socketCable = (id: string, sk: string, label: string): CableDef => ({
  id,
  label,
  conductors: [
    { color: 'br', term: `${sk}.L`, role: 'til stikkontaktens L' },
    { color: 'bl', term: `${sk}.N`, role: 'til stikkontaktens N' },
    { color: 'gg', term: `${sk}.PE`, role: 'til stikkontaktens jordklemme' },
  ],
});

const c = conn;

/** Kretsmalene. IT-anlegg bruker samme mal, men tilførselen heter L1/L2. */
export function template(spec: CircuitSpec): Template {
  const S = supply(spec.net);
  switch (spec.kind) {
    case 'lys-enpolet':
      return {
        name: 'Lys med enpolet bryter',
        info: 'Enpolet bryter bryter én leder. I et TN-anlegg skal den bryte faselederen, slik at lampen er spenningsløs når bryteren er av. Kabelen til bryteren har to ledere: fase inn og fase ut (returleder) til lampen.',
        controls: [{ id: 'SW', kind: 'enpolet', name: 'Bryter', states: 2, mount: 'switch' }],
        loads: [{ id: 'LA', kind: 'lampe', name: 'Lampe', mount: 'lamp0' }],
        cables: [
          S,
          {
            id: 'B',
            label: 'Til bryter',
            conductors: [
              { color: 'br', term: 'SW.1', role: 'til bryterens klemme 1' },
              { color: 'sv', term: 'SW.2', role: 'til bryterens klemme 2' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe'),
        ],
        correct: [c('S.br', 'B.br'), c('B.sv', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
      };
    case 'lys-topolet':
      return {
        name: 'Lys med topolet bryter',
        info: 'Topolet bryter har to brytepoler (1–2 og 3–4). I et IT-anlegg er begge lederne spenningsførende, derfor brytes begge. Kabelen til bryteren har fire ledere.',
        controls: [{ id: 'SW', kind: 'topolet', name: 'Topolet bryter', states: 2, mount: 'switch' }],
        loads: [{ id: 'LA', kind: 'lampe', name: 'Lampe', mount: 'lamp0' }],
        cables: [
          S,
          {
            id: 'B',
            label: 'Til topolet bryter',
            conductors: [
              { color: 'br', term: 'SW.1', role: 'pol 1 inn (klemme 1)' },
              { color: 'sv', term: 'SW.2', role: 'pol 1 ut (klemme 2)' },
              { color: 'gr', term: 'SW.3', role: 'pol 2 inn (klemme 3)' },
              { color: 'bl', term: 'SW.4', role: 'pol 2 ut (klemme 4)' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe'),
        ],
        correct: [c('S.br', 'B.br'), c('B.sv', 'L.br'), c('S.bl', 'B.gr'), c('B.bl', 'L.bl'), c('S.gg', 'L.gg')],
      };
    case 'lys-dimmer':
      return {
        name: 'Lys med enpolet dimmer',
        info: 'Dimmeren har en inngang (L) og en utgang til lampen (↗). Fasen skal inn på L, og lampen kobles på utgangen. Byttes de, virker ikke dimmeren. Kabelen til dimmeren: brun = L (inn), svart = utgang.',
        controls: [{ id: 'DM', kind: 'dimmer', name: 'Dimmer', states: 4, mount: 'switch' }],
        loads: [{ id: 'LA', kind: 'lampe', name: 'Lampe', mount: 'lamp0' }],
        cables: [
          S,
          {
            id: 'D',
            label: 'Til dimmer',
            conductors: [
              { color: 'br', term: 'DM.L', role: 'dimmerens inngang L' },
              { color: 'sv', term: 'DM.UT', role: 'dimmerens utgang ↗' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe'),
        ],
        correct: [c('S.br', 'D.br'), c('D.sv', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
      };
    case 'lys-trapp':
      return {
        name: 'Trappekobling (to vekselbrytere)',
        info: 'Lampen skal kunne slås av og på fra to steder. Fasen går til fellesklemmen (C) på den ene vekselbryteren. Klemme 1 og 2 kobles til klemme 1 og 2 på den andre bryteren (korrespondanseledere). Fellesklemmen på den andre bryteren går til lampen.',
        controls: [
          { id: 'W1', kind: 'veksel', name: 'Vekselbryter 1', states: 2, mount: 'switch' },
          { id: 'W2', kind: 'veksel', name: 'Vekselbryter 2', states: 2, mount: 'switch2' },
        ],
        loads: [{ id: 'LA', kind: 'lampe', name: 'Lampe', mount: 'lamp0' }],
        cables: [
          S,
          {
            id: 'V',
            label: 'Til vekselbryter 1',
            conductors: [
              { color: 'br', term: 'W1.C', role: 'fellesklemme C' },
              { color: 'sv', term: 'W1.1', role: 'klemme 1' },
              { color: 'gr', term: 'W1.2', role: 'klemme 2' },
            ],
          },
          {
            id: 'W',
            label: 'Til vekselbryter 2',
            conductors: [
              { color: 'br', term: 'W2.C', role: 'fellesklemme C' },
              { color: 'sv', term: 'W2.1', role: 'klemme 1' },
              { color: 'gr', term: 'W2.2', role: 'klemme 2' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe'),
        ],
        correct: [c('S.br', 'V.br'), c('V.sv', 'W.sv'), c('V.gr', 'W.gr'), c('W.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
      };
    case 'lys-krone':
      return {
        name: 'Kronebryter med to lamper',
        info: 'Kronebryteren har én felles inngang (L) og to utganger (1 og 2), én for hver vippe. Hver lampe skal styres av sin vippe. Begge lampene trenger nøytral og jord.',
        controls: [{ id: 'KB', kind: 'krone', name: 'Kronebryter', states: 4, mount: 'switch' }],
        loads: [
          { id: 'LA', kind: 'lampe', name: 'Lampe 1', mount: 'lamp0' },
          { id: 'LB', kind: 'lampe', name: 'Lampe 2', mount: 'lamp1' },
        ],
        cables: [
          S,
          {
            id: 'K',
            label: 'Til kronebryter',
            conductors: [
              { color: 'br', term: 'KB.L', role: 'felles inngang L' },
              { color: 'sv', term: 'KB.1', role: 'utgang vippe 1' },
              { color: 'gr', term: 'KB.2', role: 'utgang vippe 2' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe 1'),
          lampCable('M', 'LB', 'Til lampe 2'),
        ],
        correct: [
          c('S.br', 'K.br'),
          c('K.sv', 'L.br'),
          c('K.gr', 'M.br'),
          c('S.bl', 'L.bl'),
          c('L.bl', 'M.bl'),
          c('S.gg', 'L.gg'),
          c('L.gg', 'M.gg'),
        ],
      };
    case 'lys-sensor':
      return {
        name: 'Lys med bevegelsessensor',
        info: 'Sensoren er elektronisk og trenger både fase (L) og nøytral (N) for å virke. Utgangen (↗) styrer lampen. Lyset tennes når noen beveger seg i rommet.',
        controls: [{ id: 'PIR', kind: 'pir', name: 'Bevegelsessensor', states: 2, mount: 'sensor' }],
        loads: [{ id: 'LA', kind: 'lampe', name: 'Lampe', mount: 'lamp0' }],
        cables: [
          S,
          {
            id: 'P',
            label: 'Til bevegelsessensor',
            conductors: [
              { color: 'br', term: 'PIR.L', role: 'sensorens L (inn)' },
              { color: 'bl', term: 'PIR.N', role: 'sensorens N' },
              { color: 'sv', term: 'PIR.UT', role: 'sensorens utgang ↗ til lampen' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe'),
        ],
        correct: [c('S.br', 'P.br'), c('S.bl', 'P.bl'), c('P.sv', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
      };
    case 'lys-stikk':
      return {
        name: 'Lys og stikkontakt fra samme boks',
        info: 'Boksen forsyner både lys med bryter og en stikkontakt. Stikkontakten skal ha fast spenning – den skal ikke gå via bryteren.',
        controls: [{ id: 'SW', kind: 'enpolet', name: 'Bryter', states: 2, mount: 'switch' }],
        loads: [
          { id: 'LA', kind: 'lampe', name: 'Taklampen', mount: 'lamp0' },
          { id: 'K1', kind: 'stikk', name: 'Stikkontakten', mount: 'socket0' },
        ],
        cables: [
          S,
          {
            id: 'B',
            label: 'Til bryter',
            conductors: [
              { color: 'br', term: 'SW.1', role: 'til bryterens klemme 1' },
              { color: 'sv', term: 'SW.2', role: 'til bryterens klemme 2' },
            ],
          },
          lampCable('L', 'LA', 'Til lampe'),
          socketCable('K', 'K1', 'Til stikkontakt'),
        ],
        correct: [c('S.br', 'B.br'), c('B.sv', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg'), c('S.br', 'K.br'), c('S.bl', 'K.bl'), c('S.gg', 'K.gg')],
      };
    case 'stikk-dobbel':
      return {
        name: 'To stikkontakter',
        info: 'Boksen forsyner to stikkontakter. Hver stikkontakt trenger L, N og jord (PE). Norske stikkontakter (Schuko) har ingen fast side for L og N, men jord må alltid kobles.',
        controls: [],
        loads: [
          { id: 'K1', kind: 'stikk', name: 'Stikkontakt 1', mount: 'socket0' },
          { id: 'K2', kind: 'stikk', name: 'Stikkontakt 2', mount: 'socket1' },
        ],
        cables: [S, socketCable('K', 'K1', 'Til stikkontakt 1'), socketCable('Q', 'K2', 'Til stikkontakt 2')],
        correct: [c('S.br', 'K.br'), c('S.bl', 'K.bl'), c('S.gg', 'K.gg'), c('K.br', 'Q.br'), c('K.bl', 'Q.bl'), c('K.gg', 'Q.gg')],
      };
    default: {
      const name =
        spec.kind === 'stikk-ute' ? 'Utendørs stikkontakt (IP44)' : spec.kind === 'stikk-usb' ? 'Stikkontakt med USB-lader' : 'Enkel jordet stikkontakt';
      const info =
        spec.kind === 'stikk-ute'
          ? 'IP44 betyr beskyttet mot fremmedlegemer større enn 1 mm og mot vannsprut fra alle retninger. Koblingen er som for en vanlig jordet stikkontakt.'
          : spec.kind === 'stikk-usb'
            ? 'USB-laderen i stikkontakten får strøm fra de samme klemmene (L, N og PE) som stikkontakten.'
            : 'Stikkontakten trenger L, N og jord (PE). Jordingen beskytter mot elektrisk støt ved feil i apparater.';
      return {
        name,
        info,
        controls: [],
        loads: [{ id: 'K1', kind: 'stikk', name: 'Stikkontakt', mount: 'socket0' }],
        cables: [S, socketCable('K', 'K1', 'Til stikkontakt')],
        correct: [c('S.br', 'K.br'), c('S.bl', 'K.bl'), c('S.gg', 'K.gg')],
      };
    }
  }
}

/** Riktig kobling for en krets */
export function correctConns(spec: CircuitSpec | CircuitKind): string[] {
  return template(typeof spec === 'string' ? { kind: spec, net: 'TN' } : spec).correct;
}

/** Alle lederender i boksen */
export function boxEnds(spec: CircuitSpec) {
  return template(spec).cables.flatMap((cb) => cb.conductors.map((k) => ({ id: `${cb.id}.${k.color}`, cable: cb, ...k })));
}

// ---------------------------------------------------------------------------
// Simulering av kretsen
// ---------------------------------------------------------------------------
export type ControlState = Record<string, number>;

class UF {
  private p = new Map<string, string>();
  find(a: string): string {
    if (!this.p.has(a)) this.p.set(a, a);
    let x = a;
    while (this.p.get(x) !== x) x = this.p.get(x)!;
    return x;
  }
  union(a: string, b: string) {
    this.p.set(this.find(a), this.find(b));
  }
  same(a: string, b: string) {
    return this.find(a) === this.find(b);
  }
}

/** Kabler (fast koblet i andre enden) + skjøter i boksen */
function baseNet(spec: CircuitSpec, conns: string[]) {
  const uf = new UF();
  for (const cb of template(spec).cables) for (const k of cb.conductors) uf.union(`${cb.id}.${k.color}`, k.term);
  for (const x of conns) {
    const [a, b] = x.split('|');
    uf.union(a, b);
  }
  return uf;
}

const live = (uf: UF, t: string) => uf.same(t, 'S.L') || uf.same(t, 'S.N');

export interface LoadState {
  on: boolean;
  /** Lysstyrke 0–1 */
  level: number;
  pe: boolean;
  /** Fase og nøytral byttet på lampen (TN) */
  swapped: boolean;
}

export interface PowerResult {
  short: 'none' | 'L-N' | 'L-PE' | 'N-PE';
  /** Løser vernet ut? (I IT-anlegg løser ikke første jordfeil ut.) */
  trips: boolean;
  loads: Record<string, LoadState>;
}

/** Hva skjer når kursen har spenning og styringene står som angitt? */
export function power(spec: CircuitSpec, conns: string[], ctrl: ControlState): PowerResult {
  const t = template(spec);
  const base = baseNet(spec, conns);
  const uf = baseNet(spec, conns);
  let dimLevel = 1;
  for (const cd of t.controls) {
    const s = ctrl[cd.id] ?? 0;
    const p = cd.id;
    switch (cd.kind) {
      case 'enpolet':
        if (s) uf.union(`${p}.1`, `${p}.2`);
        break;
      case 'topolet':
        if (s) {
          uf.union(`${p}.1`, `${p}.2`);
          uf.union(`${p}.3`, `${p}.4`);
        }
        break;
      case 'veksel':
        uf.union(`${p}.C`, s ? `${p}.2` : `${p}.1`);
        break;
      case 'krone':
        if (s & 1) uf.union(`${p}.L`, `${p}.1`);
        if (s & 2) uf.union(`${p}.L`, `${p}.2`);
        break;
      case 'dimmer': {
        // Dimmeren virker bare når fasen kommer inn på L-klemmen
        const ok = live(base, `${p}.L`) && !live(base, `${p}.UT`);
        if (s > 0 && ok) uf.union(`${p}.L`, `${p}.UT`);
        dimLevel = s / (cd.states - 1);
        break;
      }
      case 'pir': {
        // Sensoren er elektronisk: trenger L inn og N for å virke
        const powered = (base.same(`${p}.L`, 'S.L') && base.same(`${p}.N`, 'S.N')) || (base.same(`${p}.L`, 'S.N') && base.same(`${p}.N`, 'S.L'));
        if (s && powered) uf.union(`${p}.L`, `${p}.UT`);
        break;
      }
    }
  }
  let short: PowerResult['short'] = 'none';
  if (uf.same('S.L', 'S.N')) short = 'L-N';
  else if (uf.same('S.L', 'S.PE')) short = 'L-PE';
  else if (uf.same('S.N', 'S.PE')) short = 'N-PE';
  const trips = short === 'L-N' || (spec.net === 'TN' && short !== 'none');
  const loads: Record<string, LoadState> = {};
  const hasDimmer = t.controls.some((x) => x.kind === 'dimmer');
  // Er dimmeren forbikoblet, lyser lampen fullt
  const bypass = hasDimmer && fed(baseWithControlsOff(spec, conns), 'LA');
  for (const ld of t.loads) {
    const on = !trips && fed(uf, ld.id);
    loads[ld.id] = {
      on,
      level: on ? (ld.kind === 'lampe' && hasDimmer && !bypass ? dimLevel : 1) : 0,
      pe: uf.same(`${ld.id}.PE`, 'S.PE'),
      swapped: on && uf.same(`${ld.id}.L`, 'S.N'),
    };
  }
  return { short, trips, loads };
}

function fed(uf: UF, id: string) {
  return (uf.same(`${id}.L`, 'S.L') && uf.same(`${id}.N`, 'S.N')) || (uf.same(`${id}.L`, 'S.N') && uf.same(`${id}.N`, 'S.L'));
}

function baseWithControlsOff(spec: CircuitSpec, conns: string[]) {
  const uf = baseNet(spec, conns);
  // Vekselbrytere står alltid i en stilling – her stilling 1
  for (const cd of template(spec).controls) if (cd.kind === 'veksel') uf.union(`${cd.id}.C`, `${cd.id}.1`);
  return uf;
}

/** Alle kombinasjoner av styringene */
function allStates(t: Template): ControlState[] {
  let out: ControlState[] = [{}];
  for (const cd of t.controls) {
    const next: ControlState[] = [];
    for (const s of out) for (let v = 0; v < cd.states; v++) next.push({ ...s, [cd.id]: v });
    out = next;
  }
  return out;
}

export function initialControls(spec: CircuitSpec, on: boolean): ControlState {
  const st: ControlState = {};
  for (const cd of template(spec).controls) st[cd.id] = on && cd.kind !== 'pir' ? cd.states - 1 : 0;
  return st;
}

// ---------------------------------------------------------------------------
// Faglig vurdering
// ---------------------------------------------------------------------------
export interface WiringCheck {
  correct: boolean;
  issues: string[];
}

function expectedOn(t: Template, ld: LoadDef, st: ControlState, mapping: number[]): boolean {
  if (ld.kind === 'stikk') return true;
  const cds = t.controls;
  if (cds.length === 0) return true;
  const k = cds[0];
  const v = st[k.id] ?? 0;
  switch (k.kind) {
    case 'veksel':
      // Godta begge mulige utgangsstillinger: lampen skal skifte når én bryter skiftes
      return ((st.W1 ^ st.W2) === 1) === (mapping[0] === 0);
    case 'krone': {
      const idx = t.loads.filter((l) => l.kind === 'lampe').indexOf(ld);
      const bit = mapping[idx];
      return (v & (1 << bit)) !== 0;
    }
    default:
      return v > 0;
  }
}

export function checkWiring(spec: CircuitSpec, conns: string[]): WiringCheck {
  const t = template(spec);
  const it = spec.net === 'IT';
  const issues: string[] = [];
  const states = allStates(t);
  const results = states.map((st) => ({ st, p: power(spec, conns, st) }));

  const shorts = new Set(results.map((r) => r.p.short).filter((s) => s !== 'none'));
  const where = t.controls.length && results.some((r) => r.p.short === 'none') ? ' i en av bryterstillingene' : '';
  if (shorts.has('L-N')) issues.push(it ? `Kortslutning: L1 og L2 blir koblet sammen${where}.` : `Kortslutning: fase (L) og nøytral (N) blir koblet sammen${where}.`);
  if (shorts.has('L-PE') || (it && shorts.has('N-PE')))
    issues.push(it ? 'Jordfeil: en fase er koblet til jord (PE). I et IT-anlegg løser vernet ofte ikke ut ved første jordfeil, men feilen må finnes og rettes.' : 'Jordfeil: fasen (L) er koblet til jord (PE).');
  if (!it && shorts.has('N-PE')) issues.push('Nøytral (N) er koblet til jord (PE) i boksen.');
  if (issues.length) return { correct: false, issues };

  const ctrlName = (() => {
    const k = t.controls[0]?.kind;
    return k === 'dimmer' ? 'dimmeren' : k === 'pir' ? 'sensoren' : k === 'veksel' ? 'vekselbryterne' : k === 'krone' ? 'kronebryteren' : 'bryteren';
  })();

  // Sensor uten nøytral
  const pir = t.controls.find((x) => x.kind === 'pir');
  if (pir) {
    const b = baseNet(spec, conns);
    if (!live(b, `${pir.id}.N`) || b.same(`${pir.id}.N`, `${pir.id}.L`)) issues.push('Sensoren mangler nøytral (N) og kan ikke fungere.');
    else if (!b.same(`${pir.id}.L`, 'S.L') && b.same(`${pir.id}.UT`, 'S.L')) issues.push('Inngang og utgang på sensoren er byttet. Fasen skal inn på L, og lampen kobles på utgangen (↗).');
  }
  const dim = t.controls.find((x) => x.kind === 'dimmer');
  if (dim) {
    const b = baseNet(spec, conns);
    if (live(b, `${dim.id}.UT`) && !live(b, `${dim.id}.L`)) issues.push('Inngang og utgang på dimmeren er byttet. Fasen skal inn på L-klemmen, og lampen kobles til utgangen (↗).');
  }

  // Oppførsel: sammenlign med det kretsen skal gjøre (prøv mulige tilordninger for trapp/krone)
  const mappings = t.controls[0]?.kind === 'veksel' ? [[0], [1]] : t.controls[0]?.kind === 'krone' ? [[0, 1], [1, 0]] : [[0]];
  const behaves = (mapping: number[]) => results.every(({ st, p }) => t.loads.every((ld) => p.loads[ld.id].on === expectedOn(t, ld, st, mapping)));
  if (!mappings.some(behaves)) {
    for (const ld of t.loads) {
      const ons = results.map((r) => r.p.loads[ld.id].on);
      const name = t.loads.length > 1 ? ld.name : ld.kind === 'lampe' ? 'Lampen' : 'Stikkontakten';
      if (ons.every((x) => !x)) issues.push(`${name} får aldri spenning.`);
      else if (ld.kind === 'stikk' && ons.some((x) => !x)) issues.push(`${name} får bare spenning i noen bryterstillinger. Den skal ha fast spenning og ikke gå via bryteren.`);
      else if (ld.kind === 'lampe' && ons.every((x) => x)) issues.push(`${name} lyser uansett stilling – ${ctrlName} er ikke koblet inn i kretsen.`);
    }
    if (issues.length === 0) {
      const k = t.controls[0]?.kind;
      issues.push(
        k === 'veksel'
          ? 'Lampen kan ikke slås av og på fra begge vekselbryterne. Sjekk fellesklemmene (C) og korrespondanselederne.'
          : k === 'krone'
            ? 'Kronebryteren styrer ikke de to lampene hver for seg.'
            : `Lampen følger ikke ${ctrlName} riktig.`,
      );
    }
  }

  // Bryting av riktig leder når lampen er av
  for (const ld of t.loads.filter((l) => l.kind === 'lampe')) {
    const offStates = results.filter((r) => !r.p.loads[ld.id].on && r.p.short === 'none');
    if (offStates.length === 0 || offStates.length === results.length) continue;
    const anyPhaseLeft = offStates.some(({ st }) => {
      const uf = netWithControls(spec, conns, st);
      return uf.same(`${ld.id}.L`, 'S.L') || uf.same(`${ld.id}.N`, 'S.L');
    });
    const anyL2Left = offStates.some(({ st }) => {
      const uf = netWithControls(spec, conns, st);
      return uf.same(`${ld.id}.L`, 'S.N') || uf.same(`${ld.id}.N`, 'S.N');
    });
    if (it) {
      if (anyPhaseLeft || anyL2Left) issues.push('Bryteren bryter bare én av lederne. I IT-anlegget er både L1 og L2 spenningsførende, så begge skal brytes.');
    } else if (anyPhaseLeft) {
      issues.push(`${ctrlName[0].toUpperCase()}${ctrlName.slice(1)} bryter nøytrallederen. Den skal bryte faselederen (L), slik at lampen er spenningsløs når den er av.`);
    }
  }

  // Polaritet på lamper (TN) og jord på alt utstyr
  const allOn = results.flatMap((r) => Object.entries(r.p.loads)).filter(([, s]) => s.on);
  if (!it && allOn.some(([id, s]) => s.swapped && t.loads.find((l) => l.id === id)?.kind === 'lampe')) issues.push('Fase og nøytral er byttet om på lampen.');
  const anyState = results[0].p;
  for (const ld of t.loads) {
    if (!anyState.loads[ld.id]?.pe) {
      const name = t.loads.length > 1 ? ld.name : ld.kind === 'lampe' ? 'Lampen' : 'Stikkontakten';
      issues.push(`${name} mangler jordforbindelse (PE).`);
    }
  }
  return { correct: issues.length === 0, issues: [...new Set(issues)] };
}

function netWithControls(spec: CircuitSpec, conns: string[], st: ControlState) {
  // Gjenbruker logikken i power() ved å se på lastenes forbindelser
  const t = template(spec);
  const base = baseNet(spec, conns);
  const uf = baseNet(spec, conns);
  for (const cd of t.controls) {
    const s = st[cd.id] ?? 0;
    const p = cd.id;
    if (cd.kind === 'enpolet' && s) uf.union(`${p}.1`, `${p}.2`);
    if (cd.kind === 'topolet' && s) {
      uf.union(`${p}.1`, `${p}.2`);
      uf.union(`${p}.3`, `${p}.4`);
    }
    if (cd.kind === 'veksel') uf.union(`${p}.C`, s ? `${p}.2` : `${p}.1`);
    if (cd.kind === 'krone') {
      if (s & 1) uf.union(`${p}.L`, `${p}.1`);
      if (s & 2) uf.union(`${p}.L`, `${p}.2`);
    }
    if (cd.kind === 'dimmer' && s > 0 && live(base, `${p}.L`) && !live(base, `${p}.UT`)) uf.union(`${p}.L`, `${p}.UT`);
    if (cd.kind === 'pir' && s) uf.union(`${p}.L`, `${p}.UT`);
  }
  return uf;
}

/** Hint som vises i koblingsboksen (koster poeng) */
export function hint(spec: CircuitSpec): string {
  const L = spec.net === 'IT' ? 'L1 (brun)' : 'fasen (brun)';
  const N = spec.net === 'IT' ? 'L2 (blå)' : 'nøytral (blå)';
  switch (spec.kind) {
    case 'lys-enpolet':
      return `Skjøt ${L} fra skapet til brun leder til bryteren. Svart leder fra bryteren (returleder) skjøtes til brun leder til lampen. ${N[0].toUpperCase() + N.slice(1)} og jord går rett til lampen.`;
    case 'lys-topolet':
      return `L1 → brun til bryteren (pol 1 inn), svart fra bryteren (pol 1 ut) → lampens brune. L2 → grå til bryteren (pol 2 inn), blå fra bryteren (pol 2 ut) → lampens blå. Jord rett til lampen.`;
    case 'lys-dimmer':
      return `${L} → brun til dimmeren (L inn). Svart fra dimmeren (utgang) → lampens brune. Nøytral og jord rett til lampen.`;
    case 'lys-trapp':
      return `Fasen → brun (C) til vekselbryter 1. Svart → svart og grå → grå mellom de to vekselbryterne. Brun (C) fra vekselbryter 2 → lampens brune. Nøytral og jord rett til lampen.`;
    case 'lys-krone':
      return `Fasen → brun (felles L) til kronebryteren. Svart (vippe 1) → brun til lampe 1, grå (vippe 2) → brun til lampe 2. Nøytral og jord til begge lampene.`;
    case 'lys-sensor':
      return `Fasen → brun til sensoren, nøytral → blå til sensoren. Svart fra sensoren (utgang) → lampens brune. Nøytral og jord også til lampen.`;
    case 'lys-stikk':
      return `Lyset kobles som vanlig enpolet bryter. Stikkontakten får fast spenning: brun, blå og gul/grønn fra skapet rett til stikkontaktkabelen.`;
    case 'stikk-dobbel':
      return `Brun, blå og gul/grønn fra skapet til begge stikkontaktkablene – farge mot farge.`;
    default:
      return `Brun, blå og gul/grønn fra skapet til stikkontaktkabelen – farge mot farge. Jord må alltid kobles.`;
  }
}

// ---------------------------------------------------------------------------
// Ferdige feil per kretstype (lederend-id: «kabel.farge»)
// ---------------------------------------------------------------------------
const without = (list: string[], ...remove: string[]) => list.filter((x) => !remove.includes(x));
const T = (kind: CircuitKind) => correctConns(kind);

export const FAULTS: Record<CircuitKind, Record<string, string[]>> = {
  'lys-enpolet': {
    tom: [],
    ok: T('lys-enpolet'),
    bryterN: [c('S.br', 'L.br'), c('S.bl', 'B.br'), c('B.sv', 'L.bl'), c('S.gg', 'L.gg')],
    manglerPE: without(T('lys-enpolet'), c('S.gg', 'L.gg')),
    manglerN: without(T('lys-enpolet'), c('S.bl', 'L.bl')),
    kortslutning: [...T('lys-enpolet'), c('B.sv', 'S.bl')],
    alltidPa: [c('S.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg'), c('S.br', 'B.br')],
    byttet: [c('S.br', 'B.br'), c('B.sv', 'L.bl'), c('S.bl', 'L.br'), c('S.gg', 'L.gg')],
    jordfeil: [...T('lys-enpolet'), c('L.br', 'L.gg')],
    nullJord: [...T('lys-enpolet'), c('L.bl', 'L.gg')],
    bryterForbikoblet: [...T('lys-enpolet'), c('B.br', 'B.sv')],
  },
  'lys-topolet': {
    tom: [],
    ok: T('lys-topolet'),
    enPol: [c('S.br', 'B.br'), c('B.sv', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
    manglerPE: without(T('lys-topolet'), c('S.gg', 'L.gg')),
    kortslutning: [...T('lys-topolet'), c('B.sv', 'S.bl')],
    alltidPa: [c('S.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
    jordfeil: [...T('lys-topolet'), c('L.br', 'L.gg')],
    polerKrysset: [c('S.br', 'B.br'), c('B.sv', 'B.gr'), c('B.bl', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
  },
  'lys-dimmer': {
    tom: [],
    ok: T('lys-dimmer'),
    byttet: [c('S.br', 'D.sv'), c('D.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
    iN: [c('S.br', 'L.br'), c('S.bl', 'D.br'), c('D.sv', 'L.bl'), c('S.gg', 'L.gg')],
    manglerPE: without(T('lys-dimmer'), c('S.gg', 'L.gg')),
    alltidPa: [c('S.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg'), c('S.br', 'D.br')],
  },
  'lys-trapp': {
    tom: [],
    ok: T('lys-trapp'),
    fellesFeil: [c('S.br', 'V.sv'), c('V.br', 'W.sv'), c('V.gr', 'W.gr'), c('W.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
    enKorr: without(T('lys-trapp'), c('V.gr', 'W.gr')),
    bryterN: [c('S.bl', 'V.br'), c('V.sv', 'W.sv'), c('V.gr', 'W.gr'), c('W.br', 'L.bl'), c('S.br', 'L.br'), c('S.gg', 'L.gg')],
    kortslutning: [...T('lys-trapp'), c('W.gr', 'S.bl')],
    manglerPE: without(T('lys-trapp'), c('S.gg', 'L.gg')),
  },
  'lys-krone': {
    tom: [],
    ok: T('lys-krone'),
    bareEn: without(T('lys-krone'), c('K.gr', 'M.br')),
    mangler2N: without(T('lys-krone'), c('L.bl', 'M.bl')),
    fellesFeil: [c('S.br', 'K.sv'), c('K.br', 'L.br'), c('K.gr', 'M.br'), c('S.bl', 'L.bl'), c('L.bl', 'M.bl'), c('S.gg', 'L.gg'), c('L.gg', 'M.gg')],
    sammeVippe: [c('S.br', 'K.br'), c('K.sv', 'L.br'), c('K.sv', 'M.br'), c('S.bl', 'L.bl'), c('L.bl', 'M.bl'), c('S.gg', 'L.gg'), c('L.gg', 'M.gg')],
    manglerPE: without(T('lys-krone'), c('L.gg', 'M.gg')),
  },
  'lys-sensor': {
    tom: [],
    ok: T('lys-sensor'),
    manglerN: without(T('lys-sensor'), c('S.bl', 'P.bl')),
    byttet: [c('S.br', 'P.sv'), c('S.bl', 'P.bl'), c('P.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg')],
    alltidPa: [c('S.br', 'L.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg'), c('S.br', 'P.br'), c('S.bl', 'P.bl')],
    manglerPE: without(T('lys-sensor'), c('S.gg', 'L.gg')),
  },
  'lys-stikk': {
    tom: [],
    ok: T('lys-stikk'),
    stikkPaBryter: [c('S.br', 'B.br'), c('B.sv', 'L.br'), c('B.sv', 'K.br'), c('S.bl', 'L.bl'), c('S.gg', 'L.gg'), c('S.bl', 'K.bl'), c('S.gg', 'K.gg')],
    stikkManglerPE: without(T('lys-stikk'), c('S.gg', 'K.gg')),
    bryterN: [c('S.br', 'L.br'), c('S.bl', 'B.br'), c('B.sv', 'L.bl'), c('S.gg', 'L.gg'), c('S.br', 'K.br'), c('S.bl', 'K.bl'), c('S.gg', 'K.gg')],
    kortslutning: [...T('lys-stikk'), c('K.br', 'K.bl')],
  },
  'stikk-enkel': {
    tom: [],
    ok: T('stikk-enkel'),
    manglerPE: without(T('stikk-enkel'), c('S.gg', 'K.gg')),
    manglerN: without(T('stikk-enkel'), c('S.bl', 'K.bl')),
    jordfeil: [...T('stikk-enkel'), c('K.br', 'K.gg')],
    kortslutning: [...T('stikk-enkel'), c('K.br', 'K.bl')],
  },
  'stikk-dobbel': {
    tom: [],
    ok: T('stikk-dobbel'),
    nr2Uten: without(T('stikk-dobbel'), c('K.br', 'Q.br'), c('K.bl', 'Q.bl'), c('K.gg', 'Q.gg')),
    nr2ManglerPE: without(T('stikk-dobbel'), c('K.gg', 'Q.gg')),
    kortslutning: [...T('stikk-dobbel'), c('Q.br', 'Q.bl')],
  },
  'stikk-ute': {},
  'stikk-usb': {},
};
// Utendørs- og USB-stikkontakt kobles som enkel stikkontakt
FAULTS['stikk-ute'] = FAULTS['stikk-enkel'];
FAULTS['stikk-usb'] = FAULTS['stikk-enkel'];

/** Kort beskrivelse til oppgavelisten i spillet */
export function taskLabel(spec: CircuitSpec): string {
  const t = template(spec);
  if (t.loads.every((l) => l.kind === 'stikk')) return t.loads.length > 1 ? 'Stikkontakter' : 'Stikkontakt';
  if (t.loads.some((l) => l.kind === 'stikk')) return 'Lys og stikkontakt';
  return t.loads.length > 1 ? 'To lamper' : 'Lys';
}
