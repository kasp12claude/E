import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { fmt, parseNum } from '../../utils/id';
import { resistorNetwork } from './circuits';
import { ScoreBar } from './QuizCard';
import { SimDrawing } from './SimDrawing';
import { pick, useScore } from './progress';

const RVALUES = [10, 15, 22, 33, 47, 56, 68, 100, 120, 150, 220, 330, 470];
const UVALUES = [6, 9, 12, 24];

type Kind = 'serie' | 'parallell' | 'blandet';

interface Ask {
  text: string;
  answer: number;
  unit: string;
}

interface Task {
  kind: Kind;
  R: number[];
  U: number;
  ask: Ask;
  steps: string[];
  hint: string;
}

const par = (a: number, b: number) => (a * b) / (a + b);

function makeTask(kind: Kind): Task {
  const U = pick(UVALUES);
  if (kind === 'serie') {
    const n = pick([2, 3]);
    const R = Array.from({ length: n }, () => pick(RVALUES));
    const Rt = R.reduce((s, r) => s + r, 0);
    const I = U / Rt;
    const U1 = I * R[0];
    const which = pick(['Rt', 'I', 'U1'] as const);
    const ask: Ask =
      which === 'Rt'
        ? { text: 'Hva er total resistans Rt?', answer: Rt, unit: 'Ω' }
        : which === 'I'
          ? { text: 'Hvor stor strøm I går i kretsen?', answer: I, unit: 'A' }
          : { text: 'Hvor stor er spenningen U1 over R1?', answer: U1, unit: 'V' };
    const steps = [
      `Seriekobling: Rt = ${R.map((_, i) => `R${i + 1}`).join(' + ')} = ${R.join(' + ')} = ${fmt(Rt)} Ω`,
      `Ohms lov: I = U / Rt = ${U} V / ${fmt(Rt)} Ω = ${fmt(I)} A`,
      `Spenning over R1: U1 = I · R1 = ${fmt(I)} A · ${R[0]} Ω = ${fmt(U1)} V`,
    ];
    return { kind, R, U, ask, steps, hint: 'I serie legges resistansene sammen: Rt = R1 + R2 + … Strømmen er lik overalt: I = U / Rt.' };
  }
  if (kind === 'parallell') {
    const n = pick([2, 3]);
    const R = Array.from({ length: n }, () => pick(RVALUES));
    const Rt = 1 / R.reduce((s, r) => s + 1 / r, 0);
    const It = U / Rt;
    const I1 = U / R[0];
    const which = pick(['Rt', 'It', 'I1'] as const);
    const ask: Ask =
      which === 'Rt'
        ? { text: 'Hva er total resistans Rt?', answer: Rt, unit: 'Ω' }
        : which === 'It'
          ? { text: 'Hvor stor er total strøm It fra kilden?', answer: It, unit: 'A' }
          : { text: 'Hvor stor strøm I1 går gjennom R1?', answer: I1, unit: 'A' };
    const steps = [
      `Parallellkobling: 1/Rt = ${R.map((_, i) => `1/R${i + 1}`).join(' + ')} = ${R.map((r) => `1/${r}`).join(' + ')} ⇒ Rt = ${fmt(Rt)} Ω`,
      `Alle greiner har samme spenning: U = ${U} V`,
      `Strøm i R1: I1 = U / R1 = ${U} V / ${R[0]} Ω = ${fmt(I1)} A`,
      `Total strøm: It = U / Rt = ${U} V / ${fmt(Rt)} Ω = ${fmt(It)} A (= summen av greinstrømmene)`,
    ];
    return {
      kind,
      R,
      U,
      ask,
      steps,
      hint: 'I parallell har alle greinene samme spenning. 1/Rt = 1/R1 + 1/R2 + … og total resistans blir alltid mindre enn den minste motstanden.',
    };
  }
  const R = [pick(RVALUES), pick(RVALUES), pick(RVALUES)];
  const R23 = par(R[1], R[2]);
  const Rt = R[0] + R23;
  const I = U / Rt;
  const U1 = I * R[0];
  const U23 = U - U1;
  const I2 = U23 / R[1];
  const which = pick(['Rt', 'I', 'U23', 'I2'] as const);
  const ask: Ask =
    which === 'Rt'
      ? { text: 'Hva er total resistans Rt?', answer: Rt, unit: 'Ω' }
      : which === 'I'
        ? { text: 'Hvor stor er strømmen I fra kilden (gjennom R1)?', answer: I, unit: 'A' }
        : which === 'U23'
          ? { text: 'Hvor stor er spenningen over parallellkoblingen R2 || R3?', answer: U23, unit: 'V' }
          : { text: 'Hvor stor strøm I2 går gjennom R2?', answer: I2, unit: 'A' };
  const steps = [
    `R2 og R3 i parallell: R23 = (R2 · R3) / (R2 + R3) = (${R[1]} · ${R[2]}) / (${R[1]} + ${R[2]}) = ${fmt(R23)} Ω`,
    `R1 i serie med R23: Rt = R1 + R23 = ${R[0]} + ${fmt(R23)} = ${fmt(Rt)} Ω`,
    `Strøm fra kilden: I = U / Rt = ${U} / ${fmt(Rt)} = ${fmt(I)} A`,
    `Spenning over R1: U1 = I · R1 = ${fmt(U1)} V, og over parallelldelen: U23 = U − U1 = ${fmt(U23)} V`,
    `Strøm i R2: I2 = U23 / R2 = ${fmt(U23)} / ${R[1]} = ${fmt(I2)} A`,
  ];
  return { kind, R, U, ask, steps, hint: 'Regn først ut parallelldelen som én motstand, legg den så i serie med R1.' };
}

const KIND_LABEL: Record<Kind, string> = { serie: 'Seriekobling', parallell: 'Parallellkobling', blandet: 'Blandet kobling' };

export function SeriesParallel() {
  const { score, record, reset } = useScore('serie-parallell');
  const [kind, setKind] = useState<Kind>('serie');
  const [round, setRound] = useState(0);
  const task = useMemo(() => makeTask(kind), [kind, round]);
  const circuit = useMemo(() => resistorNetwork(task.kind, task.R, task.U), [task]);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const [hint, setHint] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [peeked, setPeeked] = useState(false);

  const next = (k: Kind = kind) => {
    setKind(k);
    setRound((r) => r + 1);
    setValue('');
    setResult(null);
    setHint(false);
    setShowSteps(false);
    setPeeked(false);
  };

  const check = () => {
    const v = parseNum(value);
    if (!Number.isFinite(v)) return;
    const ok = Math.abs(v - task.ask.answer) <= Math.max(Math.abs(task.ask.answer) * 0.02, 1e-6);
    // Har eleven sett utregningen før første svar, teller ikke oppgaven som riktig
    if (result === null) record(ok && !peeked);
    setResult(ok);
    if (!ok) setShowSteps(true);
  };

  return (
    <div>
      <div className="row learn-toolbar">
        <div className="learn-segment" role="group" aria-label="Koblingstype">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} onClick={() => next(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <ScoreBar score={score} onReset={reset} />
      </div>
      <div className="card learn-quiz">
        <div className="learn-question">
          {KIND_LABEL[task.kind]}: U = {task.U} V, {task.R.map((r, i) => `R${i + 1} = ${r} Ω`).join(', ')}. {task.ask.text}
        </div>
        <div className="learn-media">
          <SimDrawing elements={circuit.elements} maxHeight={240} />
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <div className="input-unit" style={{ width: 220 }}>
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="Ditt svar" aria-label="Ditt svar" />
            <span>{task.ask.unit}</span>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!Number.isFinite(parseNum(value))}>
            Kontroller
          </button>
          <span className="small muted">Svar med 2 % nøyaktighet. Bruk komma eller punktum.</span>
        </form>
        {hint && result === null && (
          <div className="notice notice-info learn-hint" style={{ marginTop: 12 }}>
            <Lightbulb size={18} color="var(--warn)" />
            <div>{task.hint}</div>
          </div>
        )}
        {result !== null && (
          <div className={`notice ${result ? 'notice-ok' : 'notice-danger'}`} style={{ marginTop: 12 }}>
            {result ? <CheckCircle2 size={18} color="var(--ok)" /> : <XCircle size={18} color="var(--danger)" />}
            <div>
              <div style={{ fontWeight: 600 }}>
                {result ? 'Riktig!' : 'Ikke riktig ennå.'} Fasit: {fmt(task.ask.answer)} {task.ask.unit}
              </div>
              {!result && <div className="small">Se utregningen under. Du kan prøve igjen, men bare første forsøk teller i poengsummen.</div>}
            </div>
          </div>
        )}
        {showSteps && (
          <ol className="learn-steps">
            {task.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          {result === null && (
            <button className="btn" onClick={() => setHint((h) => !h)}>
              <Lightbulb size={16} /> {hint ? 'Skjul hint' : 'Vis hint'}
            </button>
          )}
          {!showSteps && (
            <button
              className="btn"
              onClick={() => {
                setShowSteps(true);
                if (result === null) setPeeked(true);
              }}
            >
              Vis utregning trinn for trinn
            </button>
          )}
          <span className="spacer" />
          <button className={`btn ${result !== null ? 'btn-primary' : ''}`} onClick={() => next()}>
            Ny oppgave <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
