import { useMemo, useState, type ReactNode } from 'react';
import { Power, RotateCcw, Square } from 'lucide-react';
import type { SimVisual } from '../../library/types';
import { Notice } from '../../components/ui';
import { selfHoldCircuit } from './circuits';
import { SimDrawing } from './SimDrawing';
import { QuestionBank, type BankQuestion } from './QuestionBank';
import { MOTOR_EXTRA } from './quizBank';

const THEORY: { title: string; text: string }[] = [
  {
    title: 'Kontaktoren',
    text: 'En kontaktor er en elektromagnetisk styrt bryter. Når spolen (A1–A2) får spenning, trekker ankeret og hovedkontaktene slutter, slik at motoren får strøm. Hjelpekontakter med samme betegnelse brukes i styrestrømkretsen. Styrestrømmen kan ha lav spenning, mens hovedkontaktene kobler motorstrømmen.',
  },
  {
    title: 'Start og stopp med selvhold',
    text: 'START-knappen er en sluttekontakt, STOPP-knappen en brytekontakt. Når START trykkes, får spolen spenning. En sluttende hjelpekontakt fra kontaktoren er koblet parallelt med START. Den holder spolen inne etter at START slippes – dette kalles selvhold. Trykk på STOPP bryter kretsen, spolen faller og selvholdet løser seg.',
  },
  {
    title: 'Hvorfor STOPP i serie og START i parallell?',
    text: 'Alle stoppfunksjoner (STOPP-knapper, motorvernkontakt) kobles i serie, slik at hver av dem alene kan bryte spolekretsen. Alle startfunksjoner kobles i parallell, slik at hver av dem alene kan starte. Et brudd i en ledning i stoppkretsen gir stopp, som er den sikre tilstanden.',
  },
  {
    title: 'Motorvernet',
    text: 'Motorvernet (termisk overstrømsvern) sitter i hovedstrømmen til motoren. Blir motoren overbelastet over tid, løser vernet ut og åpner en brytekontakt (ofte merket 95–96) i styrestrømmen. Spolen faller og motoren stopper. Vernet må stilles inn etter motorens data – se produsentens dokumentasjon.',
  },
  {
    title: 'Spenningsbortfall',
    text: 'Faller spenningen ut, slipper kontaktoren og selvholdet løser seg. Når spenningen kommer tilbake, starter ikke motoren av seg selv – noen må trykke START igjen. Dette hindrer uventet start.',
  },
  {
    title: 'Forrigling',
    text: 'Ved f.eks. høyre/venstre-gang må to kontaktorer aldri være inne samtidig (det ville gitt kortslutning mellom fasene). Man forrigler ved å sette en brytende hjelpekontakt fra den ene kontaktoren i serie med spolen til den andre – og omvendt. Ofte brukes i tillegg mekanisk forrigling.',
  },
];

const QUIZ: BankQuestion[] = [
  {
    q: 'Hvorfor kobles STOPP-knappen (brytekontakt) i serie med kontaktorspolen?',
    options: [
      'Fordi hver stoppfunksjon alene da kan bryte spolekretsen, og et ledningsbrudd gir stopp',
      'Fordi motoren går fortere da',
      'Fordi STOPP-knappen ellers ville gitt kortslutning',
      'Det spiller ingen rolle hvordan STOPP kobles',
    ],
    hint: 'Hva er den sikre tilstanden for en motor?',
    explanation: 'Stoppfunksjoner i serie: én åpen kontakt er nok til å stoppe. Et brudd i stoppkretsen gir også stopp – den sikre tilstanden.',
  },
  {
    q: 'Hva er oppgaven til hjelpekontakten som er koblet parallelt med START-knappen?',
    options: [
      'Den gir selvhold, slik at spolen holdes inne etter at START slippes',
      'Den stopper motoren ved overbelastning',
      'Den reduserer startstrømmen',
      'Den kobler inn motorvernet',
    ],
    hint: 'START er en fjærbelastet trykknapp som går tilbake når du slipper den.',
    explanation: 'Når kontaktoren trekker, lukker hjelpekontakten og overtar for START-knappen. Det kalles selvhold.',
  },
  {
    q: 'Hva skjer når motorvernet løser ut?',
    options: [
      'Brytekontakten (95–96) åpner, kontaktorspolen faller og motoren stopper',
      'Motoren går videre, men lampen blinker',
      'Sikringen i fordelingen løser ut',
      'Motoren skifter dreieretning',
    ],
    hint: 'Motorvernkontakten sitter i styrestrømmen.',
    explanation: 'Motorvernet åpner brytekontakten i serie med spolen. Spolen mister spenning, selvholdet løses og motoren stopper.',
  },
  {
    q: 'Hva menes med forrigling ved høyre/venstre-gang?',
    options: [
      'At de to kontaktorene hindres i å være inne samtidig, f.eks. med en brytekontakt fra hver i serie med den andres spole',
      'At begge kontaktorene alltid trekker samtidig',
      'At motoren låses mekanisk fast',
      'At STOPP-knappen kobles parallelt med START',
    ],
    hint: 'Hva ville skje dersom begge kontaktorene var inne samtidig?',
    explanation: 'Begge kontaktorer inne samtidig ville kortslutte fasene. Elektrisk (og ofte mekanisk) forrigling hindrer dette.',
  },
  {
    q: 'Hva betyr merkingen A1 og A2 på en kontaktor?',
    options: ['Tilkoblingene til manøverspolen', 'Hovedkontaktene for fase L1', 'Hjelpekontakt for selvhold', 'Motorens tilkoblinger'],
    hint: 'Spolen har to tilkoblinger.',
    explanation: 'A1 og A2 er tilkoblingene for kontaktorens (eller reléets) spole.',
  },
  {
    q: 'Hva er forskjellen på hovedkontakter og hjelpekontakter på en kontaktor?',
    options: [
      'Hovedkontaktene fører motorstrømmen, hjelpekontaktene brukes i styrestrømmen (selvhold, signal, forrigling)',
      'Hjelpekontaktene fører motorstrømmen, hovedkontaktene brukes til lamper',
      'Det er ingen forskjell',
      'Hovedkontakter er alltid brytekontakter',
    ],
    hint: 'Tenk på hvor mye strøm de ulike kontaktene må tåle.',
    explanation: 'Hovedkontaktene er dimensjonert for laststrømmen. Hjelpekontaktene er små kontakter for styrefunksjoner.',
  },
  {
    q: 'Hva skjer i en selvholdkrets når spenningen faller ut og deretter kommer tilbake?',
    options: [
      'Kontaktoren faller ut, og motoren starter ikke igjen før noen trykker START',
      'Motoren starter automatisk igjen når spenningen kommer tilbake',
      'Motorvernet må alltid tilbakestilles',
      'Kontaktoren blir hengende inne',
    ],
    hint: 'Selvholdet er avhengig av at spolen hele tiden har spenning.',
    explanation: 'Uten spenning slipper kontaktoren og selvholdet løses. Motoren må startes på nytt med START – det hindrer uventet start.',
  },
  {
    q: 'Hvordan kobles flere START-knapper (f.eks. fra to steder)?',
    options: ['I parallell med hverandre', 'I serie med hverandre', 'I serie med motorvernet', 'Direkte på motoren'],
    hint: 'Hver startknapp skal alene kunne starte motoren.',
    explanation: 'Startfunksjoner kobles i parallell (ELLER-funksjon), stoppfunksjoner i serie (OG-funksjon for drift).',
  },
];

const ALL_QUIZ = [...QUIZ, ...MOTOR_EXTRA];

/** Logisk modell av start/stopp med selvhold (boolsk), vist i skjemaet. */
function SelfHoldDemo() {
  const circuit = useMemo(() => selfHoldCircuit(), []);
  const [start, setStart] = useState(false);
  const [stop, setStop] = useState(false);
  const [tripped, setTripped] = useState(false);
  const [held, setHeld] = useState(false);

  // Spolen får spenning når: motorvern OK OG ikke STOPP OG (START ELLER selvhold)
  const energized = !tripped && !stop && (start || held);
  if (energized !== held) setHeld(energized);

  const { F2, S1, S2, Q1a, Q1, P1 } = circuit.c;
  const visual: Record<string, SimVisual> = {
    [F2.id]: { closed: !tripped },
    [S1.id]: { closed: !stop },
    [S2.id]: { closed: start },
    [Q1a.id]: { closed: energized },
    [Q1.id]: { energized },
    [P1.id]: { level: energized ? 1 : 0 },
  };

  const holdBtn = (label: string, set: (v: boolean) => void, icon: ReactNode, cls = '') => (
    <button
      className={`btn ${cls}`}
      onPointerDown={() => set(true)}
      onPointerUp={() => set(false)}
      onPointerLeave={() => set(false)}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && set(true)}
      onKeyUp={() => set(false)}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="card">
      <div className="card-title">Prøv selv: start/stopp med selvhold</div>
      <p className="small muted">
        Dette er en forenklet logisk modell av styrestrømmen (ikke en fullstendig elektrisk simulering). Hold knappene inne med musen eller tastaturet.
      </p>
      <div className="learn-motor-grid">
        <SimDrawing elements={circuit.elements} sim={visual} showTerminals maxHeight={420} />
        <div className="col">
          {holdBtn('Hold START (S2)', setStart, <Power size={16} />, 'btn-primary')}
          {holdBtn('Hold STOPP (S1)', setStop, <Square size={16} />, 'btn-danger')}
          <button className={`btn ${tripped ? 'btn-danger' : ''}`} onClick={() => setTripped((t) => !t)}>
            <RotateCcw size={16} /> {tripped ? 'Tilbakestill motorvern F2' : 'Simuler at motorvernet F2 løser ut'}
          </button>
          <div className={`notice ${energized ? 'notice-ok' : 'notice-info'}`} style={{ marginTop: 8 }}>
            <div>
              <strong>Kontaktor Q1: {energized ? 'inne (motoren går)' : 'ute (motoren står)'}</strong>
              <div className="small">
                {tripped
                  ? 'Motorvernets brytekontakt 95–96 er åpen – spolen kan ikke få spenning.'
                  : stop
                    ? 'STOPP er trykket inn – spolekretsen er brutt.'
                    : energized && !start
                      ? 'START er sluppet, men hjelpekontakten Q1 holder spolen inne (selvhold).'
                      : energized
                        ? 'START er trykket – spolen får spenning.'
                        : 'Trykk START for å starte.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MotorControl() {
  const [open, setOpen] = useState<number>(0);
  return (
    <div>
      <Notice kind="warn">
        Motorstyringer i virkeligheten arbeider ofte med farlig spenning og roterende maskiner. Kobling og feilsøking på slike anlegg skal bare gjøres av
        kvalifisert personell eller under kvalifisert veiledning.
      </Notice>
      <div className="learn-two-col">
        <div className="card">
          <div className="card-title">Teori</div>
          {THEORY.map((t, i) => (
            <div key={t.title} className="learn-accordion">
              <button className={`learn-accordion-head ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                {t.title}
              </button>
              {open === i && <p className="learn-accordion-body">{t.text}</p>}
            </div>
          ))}
        </div>
        <SelfHoldDemo />
      </div>
      <h3 style={{ marginTop: 20 }}>Test deg selv</h3>
      <QuestionBank moduleId="motorstyring" questions={ALL_QUIZ} />
    </div>
  );
}
