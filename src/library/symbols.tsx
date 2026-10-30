import type { ReactNode } from 'react';
import type { DocKind } from '../types';
import type { Box, PropDef, RenderCtx, SymbolDef, TerminalDef } from './types';

// ---------------------------------------------------------------------------
// Kildeangivelser. Vi påstår ikke mer enn det som er riktig: symbolene er
// forenklede gjengivelser og må kontrolleres mot standarden ved formell bruk.
// ---------------------------------------------------------------------------
export const STD_IEC =
  'Tegnet etter prinsippene i IEC 60617 (grafiske symboler for skjema). Forenklet gjengivelse – kontroller mot standarden ved formell dokumentasjon.';
export const STD_PLAN =
  'Installasjonssymbol for plantegning basert på vanlig praksis etter IEC 60617. Forenklet gjengivelse – kontroller mot gjeldende standard og firmapraksis.';
export const STD_GENERIC =
  'Generisk blokksymbol, ikke et standardisert symbol. Bruk produsentens dokumentasjon og gjeldende standard ved formell bruk.';
export const STD_DOC = 'Hjelpesymbol for dokumentasjon av skjema (ledere, klemmer og betegnelser).';
export const PREFIX_NOTE = 'Bokstavkoder er foreslått etter IEC 81346-2 og kan endres fritt.';

const SCH: DocKind[] = ['drawing', 'schematic'];
const SCH_SIM: DocKind[] = ['drawing', 'schematic', 'simulation'];
const PLAN: DocKind[] = ['drawing', 'floorplan'];

const T2: TerminalDef[] = [
  { id: '1', x: 0, y: -30, name: '1' },
  { id: '2', x: 0, y: 30, name: '2' },
];
const BOX2: Box = { x: -16, y: -30, w: 32, h: 60 };

const txt = (x: number, y: number, s: string, size = 10, anchor: 'middle' | 'start' | 'end' = 'middle', weight = 400) => (
  <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill="currentColor" stroke="none" dominantBaseline="middle">
    {s}
  </text>
);

const leads = (top = -10, bottom = 10) => (
  <>
    <line x1={0} y1={-30} x2={0} y2={top} />
    <line x1={0} y1={bottom} x2={0} y2={30} />
  </>
);

function p(key: string, label: string, def: string, unit?: string, extra: Partial<PropDef> = {}): PropDef {
  return { key, label, default: def, unit, ...extra };
}

const num = (v: string | undefined, d = 0) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : d;
};

// Kontaktsymboler -----------------------------------------------------------

function contactNO(closed: boolean, dx = 0): ReactNode {
  return closed ? (
    <line x1={dx} y1={10} x2={dx} y2={-11} />
  ) : (
    <line x1={dx} y1={10} x2={dx - 11} y2={-11} />
  );
}

function contactNC(closed: boolean, dx = 0): ReactNode {
  return (
    <>
      <line x1={dx} y1={-10} x2={dx + 10} y2={-10} />
      {closed ? <line x1={dx} y1={10} x2={dx + 11} y2={-11} /> : <line x1={dx} y1={10} x2={dx + 15} y2={-4} />}
    </>
  );
}

function pushOperator(fromX: number): ReactNode {
  return (
    <>
      <line x1={fromX} y1={0} x2={-22} y2={0} strokeDasharray="3 3" />
      <polyline points="-18,-6 -22,-6 -22,6 -18,6" />
    </>
  );
}

function coilBody(energized?: boolean): ReactNode {
  return (
    <>
      {leads(-8, 8)}
      <rect x={-15} y={-8} width={30} height={16} fill={energized ? 'rgba(59,130,246,0.35)' : 'none'} />
    </>
  );
}

const coilTerminals: TerminalDef[] = [
  { id: 'A1', x: 0, y: -30, name: 'A1' },
  { id: 'A2', x: 0, y: 30, name: 'A2' },
];

const slashes = (n: number, cx = 0, cy = 0, horizontal = false) => {
  const out: ReactNode[] = [];
  const count = Math.max(1, Math.min(6, Math.round(n)));
  for (let i = 0; i < count; i++) {
    const o = (i - (count - 1) / 2) * 6;
    out.push(
      horizontal ? (
        <line key={i} x1={cx + o - 4} y1={cy + 6} x2={cx + o + 4} y2={cy - 6} />
      ) : (
        <line key={i} x1={cx - 6} y1={cy + o + 4} x2={cx + 6} y2={cy + o - 4} />
      ),
    );
  }
  return out;
};

// ---------------------------------------------------------------------------
// Elektriske komponenter
// ---------------------------------------------------------------------------
const electrical: SymbolDef[] = [
  {
    id: 'dc-source',
    name: 'Strømkilde (likespenning)',
    category: 'elektrisk',
    group: 'Kilder',
    description: 'Batteri eller likespenningskilde. Lang strek er plusspol, kort og tykk strek er minuspol.',
    prefix: 'G',
    box: BOX2,
    terminals: [
      { id: '+', x: 0, y: -30, name: '+' },
      { id: '-', x: 0, y: 30, name: '−' },
    ],
    props: [p('U', 'Spenning', '12', 'V'), p('Ri', 'Indre resistans', '0,1', 'Ω', { hint: 'Brukes i simulatoren' })],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'source',
    render: () => (
      <>
        {leads(-5, 5)}
        <line x1={-15} y1={-5} x2={15} y2={-5} />
        <line x1={-7} y1={5} x2={7} y2={5} strokeWidth={4} />
        {txt(13, -15, '+', 11)}
      </>
    ),
    summary: (pr) => `${pr.U} V DC`,
    howItWorks: 'Kilden holder en tilnærmet konstant spenning mellom polene. Strømmen bestemmes av lasten som kobles til (Ohms lov).',
  },
  {
    id: 'ac-source',
    name: 'Strømkilde (vekselspenning)',
    category: 'elektrisk',
    group: 'Kilder',
    description: 'Vekselspenningskilde, f.eks. nett eller signalgenerator.',
    prefix: 'G',
    box: BOX2,
    terminals: T2,
    props: [p('U', 'Spenning', '230', 'V'), p('f', 'Frekvens', '50', 'Hz')],
    standard: STD_IEC,
    kinds: SCH,
    render: () => (
      <>
        {leads(-16, 16)}
        <circle r={16} />
        <path d="M-9,0 C-6,-9 -3,-9 0,0 S6,9 9,0" />
      </>
    ),
    summary: (pr) => `${pr.U} V ${pr.f} Hz`,
  },
  {
    id: 'transformer',
    name: 'Transformator',
    category: 'elektrisk',
    group: 'Kilder',
    description: 'Transformator med to viklinger. Overfører energi mellom primær- og sekundærside og endrer spenningen.',
    prefix: 'T',
    box: BOX2,
    terminals: [
      { id: 'P', x: 0, y: -30, name: 'Prim.' },
      { id: 'S', x: 0, y: 30, name: 'Sek.' },
    ],
    props: [p('U1', 'Primærspenning', '230', 'V'), p('U2', 'Sekundærspenning', '12', 'V'), p('S', 'Ytelse', '50', 'VA')],
    standard: STD_IEC,
    kinds: SCH,
    render: () => (
      <>
        <line x1={0} y1={-30} x2={0} y2={-22} />
        <line x1={0} y1={22} x2={0} y2={30} />
        <circle cy={-9} r={13} />
        <circle cy={9} r={13} />
      </>
    ),
    summary: (pr) => `${pr.U1}/${pr.U2} V ${pr.S} VA`,
    howItWorks: 'Vekselstrøm i primærviklingen gir et varierende magnetfelt i kjernen, som induserer spenning i sekundærviklingen. Omsetningen er tilnærmet lik forholdet mellom antall vindinger.',
  },
  {
    id: 'switch-no',
    name: 'Bryter (sluttekontakt)',
    category: 'elektrisk',
    group: 'Brytere og knapper',
    description: 'Kontakt som er åpen i hvilestilling og slutter når den betjenes.',
    prefix: 'S',
    box: BOX2,
    terminals: [
      { id: '1', x: 0, y: -30, name: '13' },
      { id: '2', x: 0, y: 30, name: '14' },
    ],
    props: [p('state', 'Stilling (simulering)', 'Åpen', undefined, { options: ['Åpen', 'Lukket'] })],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'switch',
    render: (c) => (
      <>
        {leads()}
        {contactNO(c.sim?.closed ?? c.props.state === 'Lukket')}
      </>
    ),
    howItWorks: 'Når bryteren betjenes, kobles de to kontaktene sammen og kretsen sluttes.',
  },
  {
    id: 'switch-nc',
    name: 'Bryter (brytekontakt)',
    category: 'elektrisk',
    group: 'Brytere og knapper',
    description: 'Kontakt som er lukket i hvilestilling og åpner når den betjenes.',
    prefix: 'S',
    box: BOX2,
    terminals: [
      { id: '1', x: 0, y: -30, name: '11' },
      { id: '2', x: 0, y: 30, name: '12' },
    ],
    props: [p('state', 'Stilling (simulering)', 'Lukket', undefined, { options: ['Åpen', 'Lukket'] })],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'switch',
    render: (c) => (
      <>
        {leads()}
        {contactNC(c.sim?.closed ?? c.props.state !== 'Åpen')}
      </>
    ),
  },
  {
    id: 'changeover',
    name: 'Vekselbryter (omkobler)',
    category: 'elektrisk',
    group: 'Brytere og knapper',
    description: 'Kobler fellespunktet C til enten kontakt 1 eller 2. Brukes f.eks. i trappekobling.',
    prefix: 'S',
    box: { x: -16, y: -30, w: 32, h: 60 },
    terminals: [
      { id: 'C', x: 0, y: 30, name: 'C' },
      { id: '1', x: -10, y: -30, name: '1' },
      { id: '2', x: 10, y: -30, name: '2' },
    ],
    props: [p('pos', 'Stilling', '1', undefined, { options: ['1', '2'] })],
    standard: STD_IEC + ' (forenklet omkobler)',
    kinds: SCH_SIM,
    sim: 'changeover',
    render: (c) => {
      const pos = c.sim ? (c.sim.closed ? '2' : '1') : c.props.pos;
      return (
        <>
          <line x1={0} y1={30} x2={0} y2={10} />
          <line x1={-10} y1={-30} x2={-10} y2={-12} />
          <line x1={10} y1={-30} x2={10} y2={-12} />
          <line x1={0} y1={10} x2={pos === '2' ? 10 : -10} y2={-12} />
          <circle cx={0} cy={10} r={1.5} fill="currentColor" />
        </>
      );
    },
  },
  {
    id: 'pushbutton-no',
    name: 'Trykknapp (slutte)',
    category: 'elektrisk',
    group: 'Brytere og knapper',
    description: 'Fjærbelastet trykknapp med sluttekontakt. Slutter bare mens knappen holdes inne (f.eks. START).',
    prefix: 'S',
    box: { x: -24, y: -30, w: 40, h: 60 },
    terminals: [
      { id: '1', x: 0, y: -30, name: '13' },
      { id: '2', x: 0, y: 30, name: '14' },
    ],
    props: [],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'pushbutton',
    render: (c) => (
      <>
        {leads()}
        {contactNO(!!c.sim?.closed)}
        {pushOperator(c.sim?.closed ? 0 : -6)}
      </>
    ),
    howItWorks: 'Kontakten sluttes kun så lenge knappen er trykket inn. Slippes knappen, går den tilbake til hvilestilling.',
  },
  {
    id: 'pushbutton-nc',
    name: 'Trykknapp (bryte)',
    category: 'elektrisk',
    group: 'Brytere og knapper',
    description: 'Fjærbelastet trykknapp med brytekontakt. Åpner kretsen mens knappen holdes inne (f.eks. STOPP).',
    prefix: 'S',
    box: { x: -24, y: -30, w: 44, h: 60 },
    terminals: [
      { id: '1', x: 0, y: -30, name: '11' },
      { id: '2', x: 0, y: 30, name: '12' },
    ],
    props: [],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'pushbutton',
    render: (c) => {
      const pressed = c.sim ? !c.sim.closed : false;
      return (
        <>
          {leads()}
          {contactNC(!pressed)}
          {pushOperator(pressed ? 8 : 5)}
        </>
      );
    },
  },
  {
    id: 'bell',
    name: 'Ringeklokke',
    category: 'elektrisk',
    group: 'Laster',
    description: 'Ringeklokke/summer som gir lydsignal når den får spenning.',
    prefix: 'P',
    box: { x: -16, y: -12, w: 32, h: 42 },
    terminals: [
      { id: '1', x: -10, y: 30, name: '1' },
      { id: '2', x: 10, y: 30, name: '2' },
    ],
    props: [p('U', 'Merkespenning', '12', 'V'), p('P', 'Effekt', '3', 'W')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'bell',
    render: (c) => (
      <>
        <path d="M-14,6 A14,14 0 0 1 14,6 Z" fill={c.sim?.level ? 'rgba(250,204,21,0.45)' : 'none'} />
        <line x1={-10} y1={6} x2={-10} y2={30} />
        <line x1={10} y1={6} x2={10} y2={30} />
      </>
    ),
    summary: (pr) => `${pr.U} V`,
  },
  {
    id: 'lamp',
    name: 'Lampe',
    category: 'elektrisk',
    group: 'Laster',
    description: 'Glødelampe eller signallampe. Sirkel med kryss.',
    prefix: 'E',
    box: BOX2,
    terminals: T2,
    props: [p('U', 'Merkespenning', '12', 'V'), p('P', 'Merkeeffekt', '5', 'W')],
    standard: STD_IEC + ' Signallamper får ofte bokstavkode P (eldre praksis: H).',
    kinds: SCH_SIM,
    sim: 'lamp',
    render: (c) => {
      const lvl = Math.min(1, c.sim?.level ?? 0);
      return (
        <>
          {leads(-12, 12)}
          {lvl > 0.02 && <circle r={18} fill="rgba(250,204,21,0.25)" stroke="none" opacity={lvl} />}
          <circle r={12} fill={lvl > 0.02 ? `rgba(250,204,21,${0.25 + lvl * 0.6})` : 'none'} />
          <line x1={-8.5} y1={-8.5} x2={8.5} y2={8.5} />
          <line x1={-8.5} y1={8.5} x2={8.5} y2={-8.5} />
        </>
      );
    },
    summary: (pr) => `${pr.U} V ${pr.P} W`,
    howItWorks: 'Strømmen varmer opp glødetråden slik at den lyser. Resistansen i modellen er R = U² / P ved merkedata.',
  },
  {
    id: 'led',
    name: 'LED-lampe',
    category: 'elektrisk',
    group: 'Laster',
    description: 'Lysdiode. Leder bare strøm én vei (fra anode til katode) og må normalt ha formotstand.',
    prefix: 'P',
    box: { x: -16, y: -30, w: 40, h: 60 },
    terminals: [
      { id: 'A', x: 0, y: -30, name: 'A' },
      { id: 'K', x: 0, y: 30, name: 'K' },
    ],
    props: [p('Uf', 'Lederetningsspenning', '2', 'V'), p('If', 'Merkestrøm', '20', 'mA')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'led',
    render: (c) => {
      const lvl = Math.min(1, c.sim?.level ?? 0);
      return (
        <>
          {leads(-8, 8)}
          <polygon points="-10,-8 10,-8 0,8" fill={lvl > 0.02 ? `rgba(239,68,68,${0.3 + lvl * 0.6})` : 'none'} />
          <line x1={-10} y1={8} x2={10} y2={8} />
          <line x1={12} y1={-2} x2={20} y2={-10} />
          <polyline points="16,-10 20,-10 20,-6" />
          <line x1={12} y1={6} x2={20} y2={-2} />
          <polyline points="16,-2 20,-2 20,2" />
        </>
      );
    },
    summary: (pr) => `${pr.Uf} V ${pr.If} mA`,
    howItWorks: 'En LED leder når spenningen i lederetningen er høyere enn ca. Uf. Strømmen må begrenses av en formotstand: R = (U − Uf) / If.',
  },
  {
    id: 'resistor',
    name: 'Motstand',
    category: 'elektrisk',
    group: 'Laster',
    description: 'Resistor (motstand). Rektangel etter IEC-praksis.',
    prefix: 'R',
    box: BOX2,
    terminals: T2,
    props: [p('R', 'Resistans', '100', 'Ω'), p('P', 'Effekttåleevne', '0,25', 'W')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'resistor',
    render: () => (
      <>
        {leads(-15, 15)}
        <rect x={-6} y={-15} width={12} height={30} />
      </>
    ),
    summary: (pr) => `${pr.R} Ω`,
    howItWorks: 'Motstanden begrenser strømmen. Spenningsfallet over den er U = R · I.',
  },
  {
    id: 'fuse',
    name: 'Sikring',
    category: 'elektrisk',
    group: 'Vern',
    description: 'Smeltesikring. Løser ut (smelter) ved for høy strøm.',
    prefix: 'F',
    box: BOX2,
    terminals: T2,
    props: [p('In', 'Merkestrøm', '1', 'A')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'fuse',
    render: (c) => (
      <>
        <rect x={-6} y={-15} width={12} height={30} />
        {c.sim?.blown ? (
          <>
            <line x1={0} y1={-30} x2={0} y2={-4} />
            <line x1={0} y1={4} x2={0} y2={30} />
            <line x1={-9} y1={-9} x2={9} y2={9} stroke="#ef4444" />
            <line x1={-9} y1={9} x2={9} y2={-9} stroke="#ef4444" />
          </>
        ) : (
          <line x1={0} y1={-30} x2={0} y2={30} />
        )}
      </>
    ),
    summary: (pr) => `${pr.In} A`,
    howItWorks: 'Når strømmen blir høyere enn sikringen tåler over tid, smelter tråden og kretsen brytes. I simulatoren løser sikringen ut straks strømmen overstiger merkestrømmen (forenklet).',
  },
  {
    id: 'ground',
    name: 'Jording',
    category: 'elektrisk',
    group: 'Tilkobling',
    description: 'Jordingssymbol (generelt). I simulatoren brukes jord som referansepunkt (0 V).',
    prefix: '',
    box: { x: -13, y: -20, w: 26, h: 32 },
    terminals: [{ id: '1', x: 0, y: -20, name: '' }],
    props: [],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'ground',
    render: () => (
      <>
        <line x1={0} y1={-20} x2={0} y2={0} />
        <line x1={-12} y1={0} x2={12} y2={0} />
        <line x1={-8} y1={5} x2={8} y2={5} />
        <line x1={-4} y1={10} x2={4} y2={10} />
      </>
    ),
  },
  {
    id: 'protective-earth',
    name: 'Beskyttelsesjord (PE)',
    category: 'elektrisk',
    group: 'Tilkobling',
    description: 'Tilkobling for beskyttelsesjord.',
    prefix: '',
    box: { x: -15, y: -20, w: 30, h: 40 },
    terminals: [{ id: '1', x: 0, y: -20, name: 'PE' }],
    props: [],
    standard: STD_IEC,
    kinds: SCH,
    render: () => (
      <>
        <line x1={0} y1={-20} x2={0} y2={0} />
        <circle cy={5} r={14} />
        <line x1={-9} y1={0} x2={9} y2={0} />
        <line x1={-6} y1={5} x2={6} y2={5} />
        <line x1={-3} y1={10} x2={3} y2={10} />
      </>
    ),
  },
  {
    id: 'junction',
    name: 'Koblingspunkt',
    category: 'elektrisk',
    group: 'Tilkobling',
    description: 'Forbindelsespunkt der ledninger er koblet sammen (fylt prikk).',
    prefix: '',
    box: { x: -5, y: -5, w: 10, h: 10 },
    terminals: [{ id: '1', x: 0, y: 0, name: '' }],
    props: [],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'conductor',
    render: () => <circle r={3.5} fill="currentColor" />,
  },
  {
    id: 'relay-coil',
    name: 'Relé (spole)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Manøverspole for relé. Kontakter med samme betegnelse (f.eks. K1) betjenes av spolen.',
    prefix: 'K',
    box: BOX2,
    terminals: coilTerminals,
    props: [p('Uc', 'Spolespenning', '12', 'V'), p('Rc', 'Spoleresistans', '240', 'Ω')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'coil',
    render: (c) => coilBody(c.sim?.energized),
    summary: (pr) => `${pr.Uc} V`,
    howItWorks: 'Strøm gjennom spolen lager et magnetfelt som trekker til ankeret, slik at reléets kontakter skifter stilling. I simulatoren trekker spolen når spenningen er minst 70 % av spolespenningen (forenklet).',
  },
  {
    id: 'relay-no',
    name: 'Relékontakt (slutte)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Sluttekontakt på relé eller kontaktor. Gi den samme betegnelse som spolen (f.eks. K1).',
    prefix: 'K',
    box: BOX2,
    terminals: [
      { id: '1', x: 0, y: -30, name: '13' },
      { id: '2', x: 0, y: 30, name: '14' },
    ],
    props: [],
    standard: STD_IEC + ' Klemmenummer etter vanlig praksis (funksjonssiffer 3–4 slutte) – kontroller mot datablad.',
    kinds: SCH_SIM,
    sim: 'relay-no',
    render: (c) => (
      <>
        {leads()}
        {contactNO(!!c.sim?.closed)}
      </>
    ),
  },
  {
    id: 'relay-nc',
    name: 'Relékontakt (bryte)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Brytekontakt på relé eller kontaktor. Gi den samme betegnelse som spolen.',
    prefix: 'K',
    box: BOX2,
    terminals: [
      { id: '1', x: 0, y: -30, name: '11' },
      { id: '2', x: 0, y: 30, name: '12' },
    ],
    props: [],
    standard: STD_IEC + ' Klemmenummer etter vanlig praksis (funksjonssiffer 1–2 bryte) – kontroller mot datablad.',
    kinds: SCH_SIM,
    sim: 'relay-nc',
    render: (c) => (
      <>
        {leads()}
        {contactNC(c.sim ? !!c.sim.closed : true)}
      </>
    ),
  },
  {
    id: 'timer-on',
    name: 'Tidsrelé (tiltrekksforsinket)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Tidsrelé der kontaktene skifter en innstilt tid etter at spolen får spenning.',
    prefix: 'K',
    box: { x: -16, y: -30, w: 46, h: 60 },
    terminals: coilTerminals,
    props: [p('t', 'Forsinkelse', '3', 's'), p('Uc', 'Spolespenning', '12', 'V'), p('Rc', 'Spoleresistans', '240', 'Ω')],
    standard: STD_IEC + ' Merking av forsinkelsestype varierer – kontroller mot standard/datablad.',
    kinds: SCH_SIM,
    sim: 'timer-on',
    render: (c) => (
      <>
        {coilBody(c.sim?.energized)}
        <rect x={15} y={-8} width={12} height={16} />
        <line x1={15} y1={-8} x2={27} y2={8} />
        <line x1={15} y1={8} x2={27} y2={-8} />
      </>
    ),
    summary: (pr) => `${pr.t} s`,
    howItWorks: 'Når spolen får spenning starter tiden. Kontaktene skifter først når den innstilte tiden er gått.',
  },
  {
    id: 'timer-off',
    name: 'Tidsrelé (frafallsforsinket)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Tidsrelé der kontaktene skifter straks, men går tilbake en innstilt tid etter at spolen mister spenning.',
    prefix: 'K',
    box: { x: -16, y: -30, w: 46, h: 60 },
    terminals: coilTerminals,
    props: [p('t', 'Forsinkelse', '3', 's'), p('Uc', 'Spolespenning', '12', 'V'), p('Rc', 'Spoleresistans', '240', 'Ω')],
    standard: STD_IEC + ' Merking av forsinkelsestype varierer – kontroller mot standard/datablad.',
    kinds: SCH_SIM,
    sim: 'timer-off',
    render: (c) => (
      <>
        {coilBody(c.sim?.energized)}
        <rect x={15} y={-8} width={12} height={16} fill="currentColor" />
      </>
    ),
    summary: (pr) => `${pr.t} s`,
  },
  {
    id: 'contactor-coil',
    name: 'Kontaktor (spole)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Manøverspole for kontaktor. Hoved- og hjelpekontakter med samme betegnelse betjenes av spolen.',
    prefix: 'Q',
    box: BOX2,
    terminals: coilTerminals,
    props: [p('Uc', 'Spolespenning', '24', 'V'), p('Rc', 'Spoleresistans', '480', 'Ω')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'coil',
    render: (c) => coilBody(c.sim?.energized),
    summary: (pr) => `${pr.Uc} V`,
    howItWorks: 'Kontaktoren er en kraftig bryter som styres av en spole. Den brukes til å koble motorer og andre store laster.',
  },
  {
    id: 'contactor-main',
    name: 'Kontaktor (hovedkontakter, 3-polet)',
    category: 'elektrisk',
    group: 'Reléer og kontaktorer',
    description: 'Tre hovedkontakter (sluttekontakter) for effektstrømkrets. Halvsirkelen markerer kontaktorfunksjon.',
    prefix: 'Q',
    box: { x: -36, y: -30, w: 66, h: 60 },
    terminals: [
      { id: '1', x: -20, y: -30, name: '1' },
      { id: '3', x: 0, y: -30, name: '3' },
      { id: '5', x: 20, y: -30, name: '5' },
      { id: '2', x: -20, y: 30, name: '2' },
      { id: '4', x: 0, y: 30, name: '4' },
      { id: '6', x: 20, y: 30, name: '6' },
    ],
    props: [p('Ie', 'Merkestrøm', '9', 'A')],
    standard: STD_IEC,
    kinds: SCH,
    render: () => (
      <>
        {[-20, 0, 20].map((x) => (
          <g key={x}>
            <line x1={x} y1={-30} x2={x} y2={-10} />
            <line x1={x} y1={30} x2={x} y2={10} />
            <line x1={x} y1={10} x2={x - 11} y2={-11} />
            <path d={`M${x - 4},-10 A4,4 0 0 0 ${x + 4},-10`} />
          </g>
        ))}
        <line x1={-34} y1={0} x2={14} y2={0} strokeDasharray="3 3" />
      </>
    ),
    summary: (pr) => `${pr.Ie} A`,
  },
  {
    id: 'motor-protection',
    name: 'Motorvern (termisk utløser, 3-polet)',
    category: 'elektrisk',
    group: 'Vern',
    description: 'Termisk overstrømsutløser for motor. Brukes sammen med en brytekontakt (95–96) i styrestrømmen.',
    prefix: 'F',
    box: { x: -30, y: -30, w: 60, h: 60 },
    terminals: [
      { id: '1', x: -20, y: -30, name: '1' },
      { id: '3', x: 0, y: -30, name: '3' },
      { id: '5', x: 20, y: -30, name: '5' },
      { id: '2', x: -20, y: 30, name: '2' },
      { id: '4', x: 0, y: 30, name: '4' },
      { id: '6', x: 20, y: 30, name: '6' },
    ],
    props: [p('Ir', 'Innstilt strøm', '4', 'A')],
    standard: STD_IEC + ' (forenklet termisk utløser)',
    kinds: SCH,
    render: () => (
      <>
        {[-20, 0, 20].map((x) => (
          <g key={x}>
            <line x1={x} y1={-30} x2={x} y2={-12} />
            <line x1={x} y1={12} x2={x} y2={30} />
            <rect x={x - 6} y={-12} width={12} height={24} />
            <polyline points={`${x},-12 ${x},-4 ${x + 4},-4 ${x + 4},4 ${x},4 ${x},12`} />
          </g>
        ))}
      </>
    ),
    summary: (pr) => `${pr.Ir} A`,
  },
  {
    id: 'overload-nc',
    name: 'Motorvernkontakt (95–96)',
    category: 'elektrisk',
    group: 'Vern',
    description: 'Brytekontakt på motorvern som åpner når vernet løser ut. Settes i serie med kontaktorspolen.',
    prefix: 'F',
    box: BOX2,
    terminals: [
      { id: '1', x: 0, y: -30, name: '95' },
      { id: '2', x: 0, y: 30, name: '96' },
    ],
    props: [p('state', 'Utløst (simulering)', 'Nei', undefined, { options: ['Nei', 'Ja'] })],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'overload-nc',
    render: (c) => (
      <>
        {leads()}
        {contactNC(c.sim ? !!c.sim.closed : c.props.state !== 'Ja')}
        <line x1={6} y1={0} x2={-14} y2={0} strokeDasharray="3 3" />
        <polyline points="-14,-6 -14,-2 -20,-2 -20,2 -14,2 -14,6" />
      </>
    ),
  },
  {
    id: 'motor-3',
    name: 'Motor (trefase)',
    category: 'elektrisk',
    group: 'Laster',
    description: 'Trefase vekselstrømsmotor med tilkobling U1, V1, W1.',
    prefix: 'M',
    box: { x: -22, y: -40, w: 44, h: 62 },
    terminals: [
      { id: 'U1', x: -20, y: -40, name: 'U1' },
      { id: 'V1', x: 0, y: -40, name: 'V1' },
      { id: 'W1', x: 20, y: -40, name: 'W1' },
    ],
    props: [p('P', 'Merkeeffekt', '1,5', 'kW'), p('U', 'Merkespenning', '400', 'V'), p('I', 'Merkestrøm', '3,4', 'A')],
    standard: STD_IEC,
    kinds: SCH,
    render: () => (
      <>
        <circle r={20} />
        <polyline points="-20,-40 -20,-30 -10,-17.3" />
        <line x1={0} y1={-40} x2={0} y2={-20} />
        <polyline points="20,-40 20,-30 10,-17.3" />
        {txt(0, -2, 'M', 15, 'middle', 600)}
        {txt(0, 11, '3~', 9)}
      </>
    ),
    summary: (pr) => `${pr.P} kW ${pr.U} V`,
    howItWorks: 'Trefasestrømmen i statorviklingene lager et roterende magnetfelt som drar rotoren med seg.',
  },
  {
    id: 'motor-dc',
    name: 'Motor (likestrøm)',
    category: 'elektrisk',
    group: 'Laster',
    description: 'Liten likestrømsmotor, f.eks. i øvingskretser.',
    prefix: 'M',
    box: BOX2,
    terminals: T2,
    props: [p('U', 'Merkespenning', '12', 'V'), p('P', 'Merkeeffekt', '6', 'W')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'motor',
    render: (c) => (
      <>
        {leads(-16, 16)}
        <circle r={16} fill={c.sim?.level ? 'rgba(34,197,94,0.3)' : 'none'} />
        {txt(0, -2, 'M', 13, 'middle', 600)}
        {txt(0, 9, '=', 9)}
      </>
    ),
    summary: (pr) => `${pr.U} V ${pr.P} W`,
  },
  {
    id: 'sensor',
    name: 'Sensor (generell)',
    category: 'elektrisk',
    group: 'Sensorer',
    description: 'Generell sensor/giver vist som blokk. Bruk produsentens skjema for detaljer.',
    prefix: 'B',
    box: { x: -18, y: -30, w: 36, h: 60 },
    terminals: [
      { id: '1', x: 0, y: -30, name: '+' },
      { id: '2', x: 0, y: 30, name: 'ut' },
    ],
    props: [p('type', 'Type', 'Induktiv', undefined, { options: ['Induktiv', 'Kapasitiv', 'Optisk', 'Temperatur', 'Annen'] })],
    standard: STD_GENERIC,
    kinds: SCH,
    render: (c) => (
      <>
        {leads(-12, 12)}
        <rect x={-16} y={-12} width={32} height={24} />
        {txt(0, 0, (c.props.type || 'Sensor').slice(0, 4), 8)}
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Installasjonsmateriell (skjema)
// ---------------------------------------------------------------------------
const installation: SymbolDef[] = [
  {
    id: 'mcb',
    name: 'Sikringsautomat',
    category: 'installasjon',
    group: 'Vern',
    description: 'Automatsikring (effektbryter med overstrømsvern). Krysset markerer effektbryterfunksjon.',
    prefix: 'F',
    box: BOX2,
    terminals: T2,
    props: [
      p('kar', 'Karakteristikk', 'B', undefined, { options: ['B', 'C', 'D'] }),
      p('In', 'Merkestrøm', '10', 'A'),
      p('state', 'Stilling', 'På', undefined, { options: ['På', 'Av'] }),
    ],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'breaker',
    render: (c) => {
      const closed = c.sim ? !!c.sim.closed : c.props.state !== 'Av';
      return (
        <>
          {leads()}
          <line x1={-4} y1={-14} x2={4} y2={-6} />
          <line x1={-4} y1={-6} x2={4} y2={-14} />
          {contactNO(closed)}
          {c.sim?.blown && txt(14, 0, 'utløst', 8)}
        </>
      );
    },
    summary: (pr) => `${pr.kar}${pr.In}`,
    howItWorks: 'Automatsikringen bryter ved overlast (termisk) og ved kortslutning (magnetisk). Den kan slås på igjen etter utløsning.',
  },
  {
    id: 'rcd',
    name: 'Jordfeilvern (2-polet)',
    category: 'installasjon',
    group: 'Vern',
    description: 'Jordfeilbryter som bryter når strømmen ut og inn ikke er like stor (lekkasjestrøm). Forenklet symbol.',
    prefix: 'F',
    box: { x: -26, y: -30, w: 50, h: 60 },
    terminals: [
      { id: '1', x: -10, y: -30, name: '1' },
      { id: '3', x: 10, y: -30, name: 'N' },
      { id: '2', x: -10, y: 30, name: '2' },
      { id: '4', x: 10, y: 30, name: 'N' },
    ],
    props: [p('IdN', 'Utløsestrøm IΔn', '30', 'mA'), p('In', 'Merkestrøm', '40', 'A')],
    standard: STD_IEC + ' (forenklet jordfeilbryter)',
    kinds: SCH,
    render: () => (
      <>
        {[-10, 10].map((x) => (
          <g key={x}>
            <line x1={x} y1={-30} x2={x} y2={-10} />
            <line x1={x} y1={10} x2={x} y2={30} />
            <line x1={x} y1={10} x2={x - 9} y2={-9} />
          </g>
        ))}
        <ellipse cx={0} cy={20} rx={16} ry={4} />
        <polyline points="-16,20 -22,20 -22,0 6,0" strokeDasharray="3 3" />
        {txt(-24, 27, 'IΔ', 8, 'end')}
      </>
    ),
    summary: (pr) => `${pr.IdN} mA`,
    howItWorks: 'Jordfeilvernet sammenligner strømmen i fase- og nøytralleder. Er forskjellen større enn utløsestrømmen, bryter vernet.',
  },
  {
    id: 'earth-bar',
    name: 'Jordskinne',
    category: 'installasjon',
    group: 'Tilkobling',
    description: 'Samleskinne for beskyttelsesledere (PE).',
    prefix: 'X',
    box: { x: -42, y: -20, w: 84, h: 46 },
    terminals: [
      { id: 'a', x: -30, y: -20, name: 'PE' },
      { id: 'b', x: -10, y: -20, name: 'PE' },
      { id: 'c', x: 10, y: -20, name: 'PE' },
      { id: 'd', x: 30, y: -20, name: 'PE' },
    ],
    bridges: [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ],
    props: [],
    standard: STD_DOC,
    kinds: SCH_SIM,
    sim: 'conductor',
    render: () => (
      <>
        {[-30, -10, 10, 30].map((x) => (
          <line key={x} x1={x} y1={-20} x2={x} y2={-5} />
        ))}
        <rect x={-40} y={-5} width={80} height={8} fill="currentColor" fillOpacity={0.2} />
        <line x1={0} y1={3} x2={0} y2={12} />
        <line x1={-10} y1={12} x2={10} y2={12} />
        <line x1={-6} y1={17} x2={6} y2={17} />
        <line x1={-2} y1={22} x2={2} y2={22} />
      </>
    ),
  },
  {
    id: 'cable-mark',
    name: 'Kabel og ledning',
    category: 'installasjon',
    group: 'Kabler',
    description: 'Kabelstrekning med antall ledere (skråstreker) og kabeltype.',
    prefix: 'W',
    box: { x: -40, y: -20, w: 80, h: 30 },
    terminals: [
      { id: '1', x: -40, y: 0, name: '' },
      { id: '2', x: 40, y: 0, name: '' },
    ],
    bridges: [['1', '2']],
    props: [p('ledere', 'Antall ledere', '3', undefined, { options: ['1', '2', '3', '4', '5'] }), p('type', 'Kabeltype', 'PFXP 3G2,5')],
    standard: STD_IEC,
    kinds: SCH,
    sim: 'conductor',
    render: (c) => (
      <>
        <line x1={-40} y1={0} x2={40} y2={0} />
        {slashes(num(c.props.ledere, 3), 0, 0, true)}
        {txt(0, -14, c.props.type, 9)}
      </>
    ),
    summary: (pr) => pr.type,
  },
];

// ---------------------------------------------------------------------------
// Plansymboler for installasjonsplanlegger
// ---------------------------------------------------------------------------
const plan: SymbolDef[] = [
  {
    id: 'plan-socket',
    name: 'Stikkontakt',
    category: 'plan',
    group: 'Uttak',
    description: 'Stikkontakt. Streken mot veggen viser monteringssiden. Tverrstrek = med jord.',
    prefix: '',
    box: { x: -12, y: -16, w: 24, h: 28 },
    terminals: [],
    props: [
      p('antall', 'Antall uttak', '2', undefined, { options: ['1', '2', '3', '4'] }),
      p('jord', 'Med jord', 'Ja', undefined, { options: ['Ja', 'Nei'] }),
      p('hoyde', 'Monteringshøyde', '30', 'cm'),
    ],
    standard: STD_PLAN,
    kinds: PLAN,
    render: (c) => (
      <>
        <path d="M-10,0 A10,10 0 0 0 10,0" />
        <line x1={-10} y1={0} x2={10} y2={0} />
        <line x1={0} y1={0} x2={0} y2={-16} />
        {c.props.jord !== 'Nei' && <line x1={-10} y1={-5} x2={10} y2={-5} />}
        {num(c.props.antall, 1) > 1 && txt(14, 6, c.props.antall, 9, 'start')}
      </>
    ),
    summary: (pr) => `${pr.antall}-veis${pr.jord === 'Ja' ? ' m/jord' : ''}`,
  },
  {
    id: 'plan-switch',
    name: 'Lysbryter',
    category: 'plan',
    group: 'Brytere',
    description: 'Lysbryter i plantegning. Antall tverrstreker viser bryterens type.',
    prefix: '',
    box: { x: -8, y: -20, w: 28, h: 28 },
    terminals: [],
    props: [
      p('type', 'Type', 'Enpolet', undefined, { options: ['Enpolet', 'Topolet', 'Vekselbryter', 'Dimmer'] }),
      p('hoyde', 'Monteringshøyde', '110', 'cm'),
    ],
    standard: STD_PLAN,
    kinds: PLAN,
    render: (c) => {
      const t = c.props.type;
      return (
        <>
          <circle r={4} />
          <line x1={2.8} y1={-2.8} x2={14} y2={-14} />
          <line x1={14} y1={-14} x2={18} y2={-10} />
          {t === 'Topolet' && <line x1={11} y1={-11} x2={15} y2={-7} />}
          {t === 'Vekselbryter' && (
            <>
              <line x1={-2.8} y1={2.8} x2={-14} y2={14} />
              <line x1={-14} y1={14} x2={-18} y2={10} />
            </>
          )}
          {t === 'Dimmer' && (
            <>
              <line x1={-10} y1={8} x2={6} y2={-8} />
              <polyline points="1,-8 6,-8 6,-3" />
            </>
          )}
        </>
      );
    },
    summary: (pr) => pr.type,
  },
  {
    id: 'plan-lamp',
    name: 'Lampepunkt',
    category: 'plan',
    group: 'Belysning',
    description: 'Tilkoblingspunkt for belysning (sirkel med kryss). Vegglampe får strek mot vegg.',
    prefix: '',
    box: { x: -12, y: -20, w: 24, h: 32 },
    terminals: [],
    props: [p('type', 'Plassering', 'Tak', undefined, { options: ['Tak', 'Vegg'] }), p('P', 'Effekt', '10', 'W')],
    standard: STD_PLAN,
    kinds: PLAN,
    render: (c) => (
      <>
        <circle r={10} />
        <line x1={-7} y1={-7} x2={7} y2={7} />
        <line x1={-7} y1={7} x2={7} y2={-7} />
        {c.props.type === 'Vegg' && <line x1={0} y1={-10} x2={0} y2={-20} />}
      </>
    ),
    summary: (pr) => `${pr.type} ${pr.P} W`,
  },
  {
    id: 'plan-downlight',
    name: 'Downlight / spotlight',
    category: 'plan',
    group: 'Belysning',
    description: 'Innfelt spotlight i tak. Forenklet symbol.',
    prefix: '',
    box: { x: -9, y: -9, w: 18, h: 18 },
    terminals: [],
    props: [p('P', 'Effekt', '6', 'W')],
    standard: STD_PLAN,
    kinds: PLAN,
    render: () => (
      <>
        <circle r={8} />
        <circle r={3} fill="currentColor" />
      </>
    ),
    summary: (pr) => `${pr.P} W`,
  },
  {
    id: 'plan-motion',
    name: 'Bevegelsessensor',
    category: 'plan',
    group: 'Brytere',
    description: 'Bevegelsesdetektor (PIR) som styrer belysning. Forenklet symbol.',
    prefix: '',
    box: { x: -12, y: -12, w: 24, h: 24 },
    terminals: [],
    props: [p('hoyde', 'Monteringshøyde', '240', 'cm')],
    standard: STD_PLAN + ' Symbolet er forenklet.',
    kinds: PLAN,
    render: () => (
      <>
        <circle r={10} />
        {txt(0, 0.5, 'PIR', 7, 'middle', 600)}
      </>
    ),
  },
  {
    id: 'plan-junction-box',
    name: 'Koblingsboks',
    category: 'plan',
    group: 'Fordeling',
    description: 'Koblingsboks/forgreningsboks. Forenklet symbol.',
    prefix: '',
    box: { x: -8, y: -8, w: 16, h: 16 },
    terminals: [],
    props: [],
    standard: STD_PLAN + ' Symbolet er forenklet.',
    kinds: PLAN,
    render: () => (
      <>
        <rect x={-7} y={-7} width={14} height={14} />
        <circle r={2.5} fill="currentColor" />
      </>
    ),
  },
  {
    id: 'plan-panel',
    name: 'Fordelingstavle',
    category: 'plan',
    group: 'Fordeling',
    description: 'Sikringsskap / fordeling. Halvt fylt rektangel. Forenklet symbol.',
    prefix: '',
    box: { x: -30, y: -10, w: 60, h: 20 },
    terminals: [],
    props: [p('navn', 'Navn', 'Fordeling 1')],
    standard: STD_PLAN + ' Symbolet er forenklet.',
    kinds: PLAN,
    render: () => (
      <>
        <rect x={-30} y={-10} width={60} height={20} />
        <polygon points="-30,10 30,-10 30,10" fill="currentColor" fillOpacity={0.6} />
      </>
    ),
    summary: (pr) => pr.navn,
  },
  {
    id: 'plan-duct',
    realSize: true,
    name: 'Kabelkanal',
    category: 'plan',
    group: 'Føringsveier',
    description: 'Kabelkanal på vegg. Lengden settes i egenskapene og tas med i materiallisten.',
    prefix: '',
    box: (pr) => {
      const L = num(pr.lengde, 1) * 100;
      return { x: -L / 2, y: -6, w: L, h: 12 };
    },
    terminals: [],
    props: [p('lengde', 'Lengde', '1', 'm'), p('dim', 'Dimensjon', '40x60', 'mm')],
    standard: STD_PLAN + ' Symbolet er forenklet.',
    kinds: PLAN,
    render: (c) => {
      const L = num(c.props.lengde, 1) * 100;
      return (
        <>
          <rect x={-L / 2} y={-6} width={L} height={12} />
          <line x1={-L / 2} y1={0} x2={L / 2} y2={0} strokeDasharray="6 4" strokeWidth={1} />
        </>
      );
    },
    summary: (pr) => `${pr.lengde} m ${pr.dim}`,
  },
  {
    id: 'plan-conduit',
    realSize: true,
    name: 'Rør',
    category: 'plan',
    group: 'Føringsveier',
    description: 'Installasjonsrør. Lengden settes i egenskapene og tas med i materiallisten.',
    prefix: '',
    box: (pr) => {
      const L = num(pr.lengde, 1) * 100;
      return { x: -L / 2, y: -5, w: L, h: 10 };
    },
    terminals: [],
    props: [p('lengde', 'Lengde', '1', 'm'), p('dim', 'Diameter', '20', 'mm')],
    standard: STD_PLAN + ' Symbolet er forenklet.',
    kinds: PLAN,
    render: (c) => {
      const L = num(c.props.lengde, 1) * 100;
      return (
        <>
          <line x1={-L / 2} y1={-4} x2={L / 2} y2={-4} />
          <line x1={-L / 2} y1={4} x2={L / 2} y2={4} />
          <line x1={-L / 2} y1={-4} x2={-L / 2} y2={4} />
          <line x1={L / 2} y1={-4} x2={L / 2} y2={4} />
        </>
      );
    },
    summary: (pr) => `${pr.lengde} m Ø${pr.dim}`,
  },
  {
    id: 'plan-door',
    realSize: true,
    name: 'Dør',
    category: 'plan',
    group: 'Bygning',
    description: 'Dør med slagretning. Plasser over veggen og roter ved behov (R).',
    prefix: '',
    box: (pr) => {
      const W = num(pr.bredde, 90);
      return { x: -W / 2, y: -W, w: W, h: W + 10 };
    },
    terminals: [],
    props: [p('bredde', 'Bredde', '90', 'cm')],
    standard: 'Bygningssymbol (forenklet).',
    kinds: PLAN,
    render: (c) => {
      const W = num(c.props.bredde, 90);
      return (
        <>
          <line x1={-W / 2} y1={0} x2={W / 2} y2={0} stroke={c.paper} strokeWidth={18} />
          <line x1={-W / 2} y1={0} x2={-W / 2} y2={-W} />
          <path d={`M${-W / 2},${-W} A${W},${W} 0 0 1 ${W / 2},0`} strokeDasharray="4 3" strokeWidth={1} />
        </>
      );
    },
    summary: (pr) => `${pr.bredde} cm`,
  },
  {
    id: 'plan-window',
    realSize: true,
    name: 'Vindu',
    category: 'plan',
    group: 'Bygning',
    description: 'Vindu i yttervegg. Plasser over veggen.',
    prefix: '',
    box: (pr) => {
      const W = num(pr.bredde, 120);
      return { x: -W / 2, y: -9, w: W, h: 18 };
    },
    terminals: [],
    props: [p('bredde', 'Bredde', '120', 'cm')],
    standard: 'Bygningssymbol (forenklet).',
    kinds: PLAN,
    render: (c) => {
      const W = num(c.props.bredde, 120);
      return (
        <>
          <rect x={-W / 2} y={-8} width={W} height={16} fill={c.paper} />
          <line x1={-W / 2} y1={0} x2={W / 2} y2={0} strokeWidth={1} />
        </>
      );
    },
    summary: (pr) => `${pr.bredde} cm`,
  },
];

// ---------------------------------------------------------------------------
// Dokumentasjonssymboler
// ---------------------------------------------------------------------------
const documentation: SymbolDef[] = [
  {
    id: 'single-line',
    name: 'Enlinjesymbol (antall ledere)',
    category: 'dokumentasjon',
    group: 'Ledere',
    description: 'I enlinjeskjema tegnes flere ledere som én strek. Skråstrekene viser antall ledere.',
    prefix: '',
    box: { x: -10, y: -30, w: 30, h: 60 },
    terminals: T2,
    bridges: [['1', '2']],
    props: [p('ledere', 'Antall ledere', '3', undefined, { options: ['1', '2', '3', '4', '5'] }), p('tekst', 'Merking', '')],
    standard: STD_IEC,
    kinds: SCH,
    sim: 'conductor',
    render: (c) => (
      <>
        <line x1={0} y1={-30} x2={0} y2={30} />
        {slashes(num(c.props.ledere, 3))}
        {c.props.tekst && txt(10, 0, c.props.tekst, 9, 'start')}
      </>
    ),
  },
  {
    id: 'bus-3',
    name: 'Flerlinjesymbol L1–L2–L3',
    category: 'dokumentasjon',
    group: 'Ledere',
    description: 'Tre faseledere tegnet hver for seg i flerlinjeskjema.',
    prefix: '',
    box: { x: -26, y: -40, w: 52, h: 80 },
    terminals: ['L1', 'L2', 'L3'].flatMap((n, i) => [
      { id: `${n}a`, x: -20 + i * 20, y: -30, name: n },
      { id: `${n}b`, x: -20 + i * 20, y: 30, name: n },
    ]),
    bridges: [
      ['L1a', 'L1b'],
      ['L2a', 'L2b'],
      ['L3a', 'L3b'],
    ],
    props: [],
    standard: STD_DOC,
    kinds: SCH,
    sim: 'conductor',
    render: () => (
      <>
        {['L1', 'L2', 'L3'].map((n, i) => (
          <g key={n}>
            <line x1={-20 + i * 20} y1={-30} x2={-20 + i * 20} y2={30} />
            {txt(-20 + i * 20, -37, n, 8)}
          </g>
        ))}
      </>
    ),
  },
  {
    id: 'bus-5',
    name: 'Flerlinjesymbol L1–L2–L3–N–PE',
    category: 'dokumentasjon',
    group: 'Ledere',
    description: 'Fem ledere (tre faser, nøytralleder og beskyttelsesleder) i flerlinjeskjema.',
    prefix: '',
    box: { x: -46, y: -40, w: 92, h: 80 },
    terminals: ['L1', 'L2', 'L3', 'N', 'PE'].flatMap((n, i) => [
      { id: `${n}a`, x: -40 + i * 20, y: -30, name: n },
      { id: `${n}b`, x: -40 + i * 20, y: 30, name: n },
    ]),
    bridges: ['L1', 'L2', 'L3', 'N', 'PE'].map((n) => [`${n}a`, `${n}b`] as [string, string]),
    props: [],
    standard: STD_DOC,
    kinds: SCH,
    sim: 'conductor',
    render: () => (
      <>
        {['L1', 'L2', 'L3', 'N', 'PE'].map((n, i) => (
          <g key={n}>
            <line x1={-40 + i * 20} y1={-30} x2={-40 + i * 20} y2={30} strokeDasharray={n === 'PE' ? '8 3 2 3' : undefined} />
            {txt(-40 + i * 20, -37, n, 8)}
          </g>
        ))}
      </>
    ),
  },
  {
    id: 'ref-tag',
    name: 'Referansebetegnelse',
    category: 'dokumentasjon',
    group: 'Betegnelser',
    description: 'Ramme med referansebetegnelse, f.eks. =A1-Q1 eller -F1.',
    prefix: '',
    box: { x: -30, y: -10, w: 60, h: 20 },
    terminals: [],
    props: [p('tekst', 'Betegnelse', '-Q1')],
    standard: 'Referansebetegnelser bygges opp etter prinsippene i IEC 81346. Kontroller struktur mot prosjektets krav.',
    kinds: SCH,
    render: (c) => (
      <>
        <rect x={-30} y={-10} width={60} height={20} strokeWidth={1} />
        {txt(0, 0.5, c.props.tekst, 10, 'middle', 600)}
      </>
    ),
  },
  {
    id: 'connection-point',
    name: 'Tilkoblingspunkt',
    category: 'dokumentasjon',
    group: 'Klemmer',
    description: 'Tilkoblingspunkt (åpen sirkel), f.eks. for ekstern tilkobling.',
    prefix: '',
    box: { x: -6, y: -6, w: 12, h: 16 },
    terminals: [{ id: '1', x: 0, y: 10, name: '' }],
    props: [p('tekst', 'Merking', '')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'conductor',
    render: (c) => (
      <>
        <circle r={4} />
        <line x1={0} y1={4} x2={0} y2={10} />
        {c.props.tekst && txt(8, 0, c.props.tekst, 9, 'start')}
      </>
    ),
  },
  {
    id: 'terminal',
    name: 'Klemme',
    category: 'dokumentasjon',
    group: 'Klemmer',
    description: 'Enkel klemme med klemmenummer. Ledningen går gjennom klemmen.',
    prefix: 'X',
    box: { x: -6, y: -10, w: 26, h: 20 },
    terminals: [
      { id: 'a', x: 0, y: -10, name: '' },
      { id: 'b', x: 0, y: 10, name: '' },
    ],
    bridges: [['a', 'b']],
    props: [p('nr', 'Klemmenummer', '1')],
    standard: STD_IEC,
    kinds: SCH_SIM,
    sim: 'conductor',
    render: (c) => (
      <>
        <line x1={0} y1={-10} x2={0} y2={-4} />
        <line x1={0} y1={4} x2={0} y2={10} />
        <circle r={4} />
        {txt(8, 0, c.props.nr, 9, 'start')}
      </>
    ),
    summary: (pr) => `kl. ${pr.nr}`,
  },
  {
    id: 'terminal-strip',
    name: 'Klemmerekke (4 klemmer)',
    category: 'dokumentasjon',
    group: 'Klemmer',
    description: 'Klemmerekke med fire klemmer. Startnummer kan endres.',
    prefix: 'X',
    box: { x: -40, y: -20, w: 80, h: 40 },
    terminals: [0, 1, 2, 3].flatMap((i) => [
      { id: `t${i}`, x: -30 + i * 20, y: -20, name: '' },
      { id: `b${i}`, x: -30 + i * 20, y: 20, name: '' },
    ]),
    bridges: [0, 1, 2, 3].map((i) => [`t${i}`, `b${i}`] as [string, string]),
    props: [p('start', 'Første klemmenummer', '1')],
    standard: STD_DOC,
    kinds: SCH_SIM,
    sim: 'conductor',
    render: (c) => {
      const s = num(c.props.start, 1);
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={-40 + i * 20} y={-8} width={20} height={16} strokeWidth={1.5} />
              <line x1={-30 + i * 20} y1={-20} x2={-30 + i * 20} y2={-8} />
              <line x1={-30 + i * 20} y1={8} x2={-30 + i * 20} y2={20} />
              {txt(-30 + i * 20, 0.5, String(s + i), 9)}
            </g>
          ))}
        </>
      );
    },
  },
];

export const SYMBOLS: SymbolDef[] = [...electrical, ...installation, ...plan, ...documentation];

const byId = new Map(SYMBOLS.map((s) => [s.id, s]));

export function getSymbol(id: string): SymbolDef | undefined {
  return byId.get(id);
}

export function symbolBox(def: SymbolDef, props: Record<string, string>): Box {
  return typeof def.box === 'function' ? def.box(props) : def.box;
}

export function defaultProps(def: SymbolDef): Record<string, string> {
  return Object.fromEntries(def.props.map((pd) => [pd.key, pd.default]));
}

export function symbolsForKind(kind: string): SymbolDef[] {
  return SYMBOLS.filter((s) => s.kinds.includes(kind as DocKind));
}

/** Anbefalte komponenter per skjematype (vises øverst i biblioteket). */
export const MODE_RECOMMENDED: Record<string, string[]> = {
  enlinje: ['mcb', 'rcd', 'single-line', 'cable-mark', 'transformer', 'lamp', 'motor-3', 'ref-tag'],
  flerlinje: ['bus-5', 'bus-3', 'mcb', 'rcd', 'contactor-main', 'motor-3', 'terminal-strip'],
  styrestrom: ['pushbutton-no', 'pushbutton-nc', 'relay-coil', 'relay-no', 'relay-nc', 'contactor-coil', 'timer-on', 'lamp', 'fuse'],
  effektstrom: ['bus-3', 'mcb', 'contactor-main', 'motor-protection', 'motor-3', 'fuse', 'terminal-strip'],
  lavspenning: ['mcb', 'rcd', 'earth-bar', 'cable-mark', 'single-line', 'bus-5', 'protective-earth'],
  motorstyring: ['pushbutton-nc', 'pushbutton-no', 'contactor-coil', 'relay-no', 'overload-nc', 'motor-protection', 'contactor-main', 'motor-3', 'timer-on'],
  prinsipp: ['dc-source', 'switch-no', 'lamp', 'resistor', 'fuse', 'junction', 'ground'],
  ovingsoppgave: ['dc-source', 'switch-no', 'changeover', 'lamp', 'resistor', 'led', 'relay-coil', 'relay-no', 'terminal'],
};
