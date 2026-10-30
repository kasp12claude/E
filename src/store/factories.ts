import type { DocKind, DrawingDoc, PlanData, Project, Report, ReportSection, SchematicMode } from '../types';
import { todayIso, uid } from '../utils/id';

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  drawing: 'Tegning',
  schematic: 'Koblingsskjema',
  floorplan: 'Plantegning',
  simulation: 'Simulering',
};

export const SCHEMATIC_MODES: { id: SchematicMode; name: string; description: string }[] = [
  { id: 'enlinje', name: 'Enlinjeskjema', description: 'Viser anlegget forenklet med én strek per kurs. Antall ledere markeres med skråstreker.' },
  { id: 'flerlinje', name: 'Flerlinjeskjema', description: 'Viser hver leder for seg (f.eks. L1, L2, L3, N, PE).' },
  { id: 'styrestrom', name: 'Styrestrømskjema', description: 'Styrekretser med trykknapper, reléer, spoler og signallamper.' },
  { id: 'effektstrom', name: 'Effektstrømskjema', description: 'Hovedstrømkretser: vern, kontaktorer, motorvern og motorer.' },
  { id: 'lavspenning', name: 'Lavspenningsskjema', description: 'Fordeling og kurser i lavspenningsanlegg.' },
  { id: 'motorstyring', name: 'Motorstyringsskjema', description: 'Start/stopp, selvhold, tidsreléer og motorvern.' },
  { id: 'prinsipp', name: 'Prinsippskjema', description: 'Enkel prinsipiell fremstilling av hvordan en krets virker.' },
  { id: 'ovingsoppgave', name: 'Koblingsskjema for øvingsoppgaver', description: 'Skjema med oppgavetekst, beregnet for skole og øving.' },
];

export function modeName(mode?: SchematicMode) {
  return SCHEMATIC_MODES.find((m) => m.id === mode)?.name ?? '';
}

export function newDoc(kind: DocKind, name: string, mode?: SchematicMode): DrawingDoc {
  const now = Date.now();
  return {
    id: uid('doc'),
    kind,
    name,
    mode: kind === 'schematic' ? mode ?? 'prinsipp' : undefined,
    placement: 'manual',
    showTerminals: kind === 'schematic' || kind === 'simulation',
    sheet: {
      show: kind === 'schematic' || kind === 'drawing',
      size: 'A3',
      orientation: 'landscape',
    },
    taskText: mode === 'ovingsoppgave' ? 'Oppgave: Beskriv hva kretsen skal gjøre her.' : undefined,
    elements: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyPlan(): PlanData {
  return {
    tasks: [],
    checklists: [
      {
        id: uid('cl'),
        title: 'Før arbeidet starter',
        items: [
          { id: uid('ci'), text: 'Arbeidsoppgaven er forstått og planlagt', done: false },
          { id: uid('ci'), text: 'Risikovurdering er gjennomført', done: false },
          { id: uid('ci'), text: 'Nødvendig verneutstyr er tilgjengelig', done: false },
          { id: uid('ci'), text: 'Avklart med lærer/ansvarlig før arbeid på anlegg', done: false },
        ],
      },
    ],
    materials: [],
    tools: [],
    notes: '',
  };
}

export function newProject(name: string, description = ''): Project {
  const now = Date.now();
  return {
    id: uid('prj'),
    version: 1,
    name: name.trim() || 'Uten navn',
    description,
    createdAt: now,
    updatedAt: now,
    docs: [],
    plan: emptyPlan(),
    notes: '',
    calculations: [],
    reports: [],
    attachments: [],
  };
}

function sec(title: string, kind: ReportSection['kind'], help: string, extra: Partial<ReportSection> = {}): ReportSection {
  return { id: uid('sec'), title, kind, help, text: '', ...extra };
}

const HMS_ITEMS = [
  'Jeg har fått opplæring i arbeidet som skal utføres',
  'Arbeidsområdet er ryddig og oversiktlig',
  'Riktig verneutstyr er i bruk (f.eks. vernebriller, egnet tøy)',
  'Spenningskilden er kontrollert og godkjent av lærer/ansvarlig',
  'Kretsen er spenningsløs ved om-kobling',
  'Måleinstrument er kontrollert og egnet for målingen',
  'Avvik og uønskede hendelser er meldt',
];

export function newReport(template: 'standard' | 'skole', author = '', className = ''): Report {
  const now = Date.now();
  const common: ReportSection[] = [
    sec('Formål', 'text', 'Hva skal arbeidet oppnå? Hvorfor gjøres det?'),
    sec('Utstyrsliste', 'table', 'Verktøy og instrumenter som er brukt.', {
      columns: ['Utstyr', 'Antall', 'Merknad'],
      rows: [['', '', '']],
    }),
    sec('Komponentliste', 'table', 'Komponenter i kretsen/anlegget. Kan fylles automatisk fra et skjema.', {
      columns: ['Betegnelse', 'Komponent', 'Data', 'Antall'],
      rows: [['', '', '', '']],
    }),
    sec('Beskrivelse av arbeidet', 'text', 'Beskriv fremgangsmåten steg for steg.'),
    sec('Risikovurdering', 'table', 'Hva kan gå galt, hvor sannsynlig er det, hva blir konsekvensen og hvilke tiltak gjøres?', {
      columns: ['Fare/aktivitet', 'Sannsynlighet (1–5)', 'Konsekvens (1–5)', 'Tiltak'],
      rows: [['', '', '', '']],
    }),
    sec('HMS-sjekkliste', 'checklist', 'Kryss av punktene som er ivaretatt.', {
      items: HMS_ITEMS.map((t) => ({ id: uid('ci'), text: t, done: false })),
    }),
    sec('Koblingsskjema', 'drawing', 'Velg ett eller flere koblingsskjema fra prosjektet.', { drawingIds: [] }),
    sec('Plantegning', 'drawing', 'Velg plantegning fra prosjektet.', { drawingIds: [] }),
    sec('Bilder fra arbeidet', 'images', 'Legg til bilder fra prosjektets vedlegg.', { imageIds: [] }),
    sec('Måleresultater', 'table', 'Før inn målte verdier og sammenlign med beregnede verdier.', {
      columns: ['Målepunkt', 'Størrelse', 'Beregnet', 'Målt', 'Enhet', 'Kommentar'],
      rows: [['', '', '', '', '', '']],
    }),
    sec('Feilsøking', 'text', 'Beskriv feil som oppsto, hvordan de ble funnet og hvordan de ble rettet.'),
  ];
  const sections =
    template === 'skole'
      ? [
          sec('Innledning', 'text', 'Skriv kort om oppgaven med egne ord. Hva skal du lage, og hva skal du lære?'),
          ...common,
          sec('Teori', 'text', 'Forklar teorien bak kretsen med egne ord (f.eks. Ohms lov, serie/parallell).'),
          sec('Egenvurdering', 'text', 'Hva gikk bra? Hva var vanskelig? Hva ville du gjort annerledes neste gang?'),
          sec('Konklusjon', 'text', 'Oppsummer resultatet. Ble formålet oppnådd?'),
        ]
      : [
          ...common,
          sec('Egenvurdering', 'text', 'Vurdering av eget arbeid.'),
          sec('Konklusjon', 'text', 'Oppsummering og konklusjon.'),
        ];
  return {
    id: uid('rep'),
    title: template === 'skole' ? 'Elevrapport' : 'Rapport',
    template,
    author,
    className,
    date: todayIso(),
    sections,
    createdAt: now,
    updatedAt: now,
  };
}
