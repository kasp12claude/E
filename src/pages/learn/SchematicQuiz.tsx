import { useMemo, useState, type ReactNode } from 'react';
import type { ComponentEl } from '../../types';
import { emptySimState, simulate } from '../../sim/solver';
import { fmt } from '../../utils/id';
import { parallelWithBranchSwitch, relayCircuit, seriesTwoLamps, stairCircuit, type Circuit } from './circuits';
import { QuizCard, ScoreBar, type QuizOption } from './QuizCard';
import { SimDrawing } from './SimDrawing';
import { pick, useScore } from './progress';

interface Task {
  circuit: Circuit;
  question: ReactNode;
  options: QuizOption[];
  correctId: string;
  hint: string;
  explanation: ReactNode;
}

const LIT = 0.05;

function lampStatus(circuit: Circuit, lamps: string[]) {
  const r = simulate(circuit.elements, emptySimState());
  return lamps.map((l) => {
    const c = circuit.c[l] as ComponentEl;
    return { label: l, lit: (r.visual[c.id]?.level ?? 0) > LIT, u: Math.abs(r.voltageAcross[c.id] ?? 0), i: Math.abs(r.current[c.id] ?? 0) };
  });
}

function twoLampOptions(): QuizOption[] {
  return [
    { id: 'ingen', label: 'Ingen av lampene' },
    { id: 'E1', label: 'Bare E1' },
    { id: 'E2', label: 'Bare E2' },
    { id: 'begge', label: 'Både E1 og E2' },
  ];
}

function twoLampAnswer(st: { label: string; lit: boolean }[]) {
  const lit = st.filter((s) => s.lit).map((s) => s.label);
  return lit.length === 0 ? 'ingen' : lit.length === 2 ? 'begge' : lit[0];
}

const statusText = (st: ReturnType<typeof lampStatus>) =>
  st.map((s) => `${s.label}: ${fmt(s.u, 3)} V, ${fmt(s.i, 3)} A – ${s.lit ? 'lyser' : 'lyser ikke'}`).join('; ');

const GENERATORS: (() => Task)[] = [
  // Seriekobling
  () => {
    const closed = Math.random() < 0.6;
    const circuit = seriesTwoLamps(closed);
    const st = lampStatus(circuit, ['E1', 'E2']);
    return {
      circuit,
      question: (
        <>
          Bryteren S1 er <strong>{closed ? 'lukket' : 'åpen'}</strong>. Hvilke lamper lyser?
        </>
      ),
      options: twoLampOptions(),
      correctId: twoLampAnswer(st),
      hint: 'Lampene er koblet etter hverandre (i serie). I en seriekobling går den samme strømmen gjennom alle komponentene.',
      explanation: (
        <>
          {closed
            ? 'Når S1 er lukket går strømmen gjennom begge lampene. Fordi de er i serie, deler de spenningen – hver lampe får omtrent halve spenningen og lyser svakere enn alene.'
            : 'Når S1 er åpen er kretsen brutt, og det går ingen strøm i en seriekobling. Ingen av lampene lyser.'}
          <div className="small muted" style={{ marginTop: 4 }}>
            Simulert: {statusText(st)}
          </div>
        </>
      ),
    };
  },
  // Spenningsdeling i serie
  () => {
    const circuit = seriesTwoLamps(true);
    const st = lampStatus(circuit, ['E1', 'E2']);
    const u = Math.round(st[0].u);
    const opts = [0, 6, 12, 24];
    return {
      circuit,
      question: 'S1 er lukket og lampene E1 og E2 er like (12 V, 5 W). Omtrent hvor stor spenning blir det over E1?',
      options: opts.map((o) => ({ id: String(o), label: `${o} V` })),
      correctId: String(opts.includes(u) ? u : 6),
      hint: 'Kildespenningen fordeles over komponentene i serie. Like store motstander får like stor del.',
      explanation: (
        <>
          Kilden gir 12 V. To like lamper i serie deler spenningen likt: 12 V / 2 = 6 V over hver. (Sum av delspenningene = kildespenningen.)
          <div className="small muted" style={{ marginTop: 4 }}>
            Simulert: {statusText(st)}
          </div>
        </>
      ),
    };
  },
  // Parallell med greinbryter
  () => {
    const s1 = Math.random() < 0.75;
    const s2 = Math.random() < 0.5;
    const circuit = parallelWithBranchSwitch(s1, s2);
    const st = lampStatus(circuit, ['E1', 'E2']);
    return {
      circuit,
      question: (
        <>
          S1 er <strong>{s1 ? 'lukket' : 'åpen'}</strong> og S2 er <strong>{s2 ? 'lukket' : 'åpen'}</strong>. Hvilke lamper lyser?
        </>
      ),
      options: twoLampOptions(),
      correctId: twoLampAnswer(st),
      hint: 'S1 sitter i felles tilførsel og styrer begge greinene. S2 sitter bare i greina til E2.',
      explanation: (
        <>
          Lampene er koblet i parallell, så hver grein får full spenning når den er sluttet. S1 bryter begge greinene, mens S2 bare påvirker E2.
          <div className="small muted" style={{ marginTop: 4 }}>
            Simulert: {statusText(st)}
          </div>
        </>
      ),
    };
  },
  // Trappekobling
  () => {
    const p1 = pick(['1', '2'] as const);
    const p2 = pick(['1', '2'] as const);
    const circuit = stairCircuit(p1, p2);
    const st = lampStatus(circuit, ['E1']);
    return {
      circuit,
      question: (
        <>
          Trappekobling: vekselbryter S1 står i stilling <strong>{p1}</strong> og S2 i stilling <strong>{p2}</strong>. Lyser lampen E1?
        </>
      ),
      options: [
        { id: 'ja', label: 'Ja, E1 lyser' },
        { id: 'nei', label: 'Nei, E1 lyser ikke' },
      ],
      correctId: st[0].lit ? 'ja' : 'nei',
      hint: 'Følg strømveien fra pluss: gjennom fellespunktet C på S1, videre på den forbindelsen (korrespondenten) S1 står mot, og se om S2 står mot den samme.',
      explanation: (
        <>
          I en trappekobling er de to vekselbryterne forbundet med to ledere (korrespondenter). Lampen lyser bare når begge bryterne peker mot den samme
          lederen. Uansett hvilken bryter du skifter, endres lampens tilstand – derfor kan lyset styres fra to steder.
          <div className="small muted" style={{ marginTop: 4 }}>
            Simulert: {statusText(st)}
          </div>
        </>
      ),
    };
  },
  // Relé
  () => {
    const s1 = Math.random() < 0.5;
    const contact = pick(['relay-no', 'relay-nc'] as const);
    const circuit = relayCircuit(s1, contact);
    const st = lampStatus(circuit, ['E1']);
    return {
      circuit,
      question: (
        <>
          S1 er <strong>{s1 ? 'lukket' : 'åpen'}</strong>. Kontakten K1 i lampekretsen er en <strong>{contact === 'relay-no' ? 'sluttekontakt' : 'brytekontakt'}</strong>. Lyser
          E1?
        </>
      ),
      options: [
        { id: 'ja', label: 'Ja, E1 lyser' },
        { id: 'nei', label: 'Nei, E1 lyser ikke' },
      ],
      correctId: st[0].lit ? 'ja' : 'nei',
      hint: 'Når spolen K1 får spenning, skifter alle kontakter med betegnelse K1 stilling: sluttekontakter lukker, brytekontakter åpner.',
      explanation: (
        <>
          Skjemaet viser kontaktene i hvilestilling (spolen uten spenning). {s1 ? 'S1 er lukket, så spolen K1 trekker.' : 'S1 er åpen, så spolen K1 er uten spenning.'}{' '}
          {contact === 'relay-no'
            ? 'En sluttekontakt lukker når spolen trekker.'
            : 'En brytekontakt er lukket i hvile og åpner når spolen trekker.'}
          <div className="small muted" style={{ marginTop: 4 }}>
            Simulert: {statusText(st)}
          </div>
        </>
      ),
    };
  },
];

export function SchematicQuiz() {
  const { score, record, reset } = useScore('skjema');
  const [round, setRound] = useState(0);
  const task = useMemo(() => pick(GENERATORS)(), [round]);
  return (
    <div>
      <div className="row learn-toolbar">
        <p className="muted" style={{ margin: 0 }}>
          Studer skjemaet og svar på spørsmålet. Svarene kontrolleres med den innebygde simulatoren (idealisert likestrømsmodell, 12 V).
        </p>
        <span className="spacer" />
        <ScoreBar score={score} onReset={reset} />
      </div>
      <QuizCard
        key={round}
        question={task.question}
        media={<SimDrawing elements={task.circuit.elements} showTerminals={false} maxHeight={280} />}
        options={task.options}
        correctId={task.correctId}
        hint={task.hint}
        explanation={task.explanation}
        onAnswered={record}
        onNext={() => setRound((r) => r + 1)}
      />
    </div>
  );
}
