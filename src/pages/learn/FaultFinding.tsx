import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Gauge, Lightbulb, Trash2, XCircle } from 'lucide-react';
import type { ComponentEl } from '../../types';
import { getSymbol } from '../../library/symbols';
import { terminalsOf } from '../../editor/geometry';
import { emptySimState, simulate, type SimState } from '../../sim/solver';
import { Notice, SafetyNotice } from '../../components/ui';
import { fmt } from '../../utils/id';
import { ledCircuit, parallelThreeLamps, seriesTwoLamps, type Circuit } from './circuits';
import { ScoreBar } from './QuizCard';
import { SimDrawing, type TestPoint } from './SimDrawing';
import { pick, useScore } from './progress';

type FaultType = 'brudd' | 'kortslutning';

interface Scenario {
  id: string;
  title: string;
  description: string;
  build: () => Circuit;
  faults: { label: string; type: FaultType }[];
  hint: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'serie',
    title: 'Seriekrets med sikring',
    description: 'G1 (12 V) forsyner to lamper i serie via bryteren S1 og sikringen F1. S1 er lukket.',
    build: () => seriesTwoLamps(true, { fuse: true }),
    faults: [
      { label: 'S1', type: 'brudd' },
      { label: 'F1', type: 'brudd' },
      { label: 'E1', type: 'brudd' },
      { label: 'E2', type: 'brudd' },
      { label: 'E1', type: 'kortslutning' },
      { label: 'E2', type: 'kortslutning' },
    ],
    hint: 'I en seriekrets med brudd går det ingen strøm. Da blir det ikke spenningsfall over de hele komponentene, og hele kildespenningen ligger over bruddet.',
  },
  {
    id: 'parallell',
    title: 'Parallellkrets med tre lamper',
    description: 'G1 (12 V) forsyner tre lamper i parallell via S1 og sikringen F1 (2 A). S1 er lukket.',
    build: parallelThreeLamps,
    faults: [
      { label: 'S1', type: 'brudd' },
      { label: 'F1', type: 'brudd' },
      { label: 'E1', type: 'brudd' },
      { label: 'E2', type: 'brudd' },
      { label: 'E3', type: 'brudd' },
    ],
    hint: 'Lyser noen av lampene, er felles tilførsel (S1 og F1) i orden. Mål spenningen over lampen som ikke lyser – får den spenning, er feilen i selve lampen.',
  },
  {
    id: 'led',
    title: 'LED med formotstand',
    description: 'G1 (12 V) forsyner lysdioden P1 gjennom bryteren S1 og formotstanden R1 (470 Ω). S1 er lukket.',
    build: ledCircuit,
    faults: [
      { label: 'S1', type: 'brudd' },
      { label: 'R1', type: 'brudd' },
      { label: 'P1', type: 'brudd' },
      { label: 'R1', type: 'kortslutning' },
    ],
    hint: 'Normalt ligger det ca. 2 V over LED-en og resten av spenningen over formotstanden. Sammenlign målingene med det du forventer.',
  },
];

const LIT = 0.05;

interface Task {
  scenario: Scenario;
  circuit: Circuit;
  fault: { label: string; type: FaultType };
  points: TestPoint[];
  pointKey: Record<string, string>;
}

function makeTask(scenarioId?: string): Task {
  const scenario = scenarioId ? SCENARIOS.find((s) => s.id === scenarioId)! : pick(SCENARIOS);
  const circuit = scenario.build();
  const fault = pick(scenario.faults);
  const points: TestPoint[] = [];
  const pointKey: Record<string, string> = {};
  let n = 0;
  for (const el of circuit.elements) {
    if (el.type !== 'component') continue;
    for (const t of terminalsOf(el)) {
      const letter = String.fromCharCode(65 + n++);
      const id = `${el.id}:${t.id}`;
      points.push({ id, label: letter, pt: { x: t.x, y: t.y } });
      pointKey[id] = `${letter} – ${el.label} ${t.name || t.id}`;
    }
  }
  return { scenario, circuit, fault, points, pointKey };
}

function symptoms(circuit: Circuit, visual: Record<string, { level?: number }>, current: Record<string, number>) {
  const out: string[] = [];
  for (const c of Object.values(circuit.c)) {
    const role = getSymbol(c.symbolId)?.sim;
    if (role === 'lamp') {
      const lvl = visual[c.id]?.level ?? 0;
      out.push(lvl > 0.9 ? `${c.label} lyser kraftig` : lvl > LIT ? `${c.label} lyser` : `${c.label} lyser ikke`);
    } else if (role === 'led') {
      const I = current[c.id] ?? 0;
      const If = Number(String(c.props.If).replace(',', '.')) / 1000 || 0.02;
      out.push(I > If * 1.5 ? `${c.label} lyser svært kraftig (overbelastes)` : I > If * LIT ? `${c.label} lyser` : `${c.label} lyser ikke`);
    }
  }
  return out;
}

export function FaultFinding() {
  const { score, record, reset } = useScore('feilsoking');
  const [scenarioId, setScenarioId] = useState<string>('tilfeldig');
  const [round, setRound] = useState(0);
  const task = useMemo(() => makeTask(scenarioId === 'tilfeldig' ? undefined : scenarioId), [scenarioId, round]);
  const faultyId = task.circuit.c[task.fault.label].id;
  const sim = useMemo(() => {
    const st: SimState = { ...emptySimState(), faults: { [faultyId]: task.fault.type } };
    return simulate(task.circuit.elements, st);
  }, [task, faultyId]);

  const [red, setRed] = useState<string>('');
  const [black, setBlack] = useState<string>('');
  const [nextProbe, setNextProbe] = useState<'red' | 'black'>('red');
  const [log, setLog] = useState<{ a: string; b: string; v: number }[]>([]);
  const [guess, setGuess] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const reading = (() => {
    if (!red || !black) return null;
    const na = sim.netlist.netOfTerminal.get(red);
    const nb = sim.netlist.netOfTerminal.get(black);
    if (na === undefined || nb === undefined) return null;
    const v = sim.netVoltage[na] - sim.netVoltage[nb];
    return Math.abs(v) < 0.005 ? 0 : v;
  })();

  const newTask = (s = scenarioId) => {
    setScenarioId(s);
    setRound((r) => r + 1);
    setRed('');
    setBlack('');
    setNextProbe('red');
    setLog([]);
    setGuess(null);
    setAttempts(0);
    setSolved(false);
    setShowHint(false);
  };

  const clickPoint = (id: string) => {
    if (nextProbe === 'red') setRed(id);
    else setBlack(id);
    setNextProbe((p) => (p === 'red' ? 'black' : 'red'));
  };

  const candidates = Object.values(task.circuit.c).filter((c: ComponentEl) => getSymbol(c.symbolId)?.sim !== 'source');

  const answer = (label: string) => {
    if (solved) return;
    const ok = label === task.fault.label;
    if (attempts === 0) record(ok);
    setAttempts((a) => a + 1);
    setGuess(label);
    if (ok) setSolved(true);
  };

  const faultText = task.fault.type === 'brudd' ? 'brudd' : 'kortslutning';
  const sy = symptoms(task.circuit, sim.visual, sim.current);

  return (
    <div>
      <SafetyNotice variant="simulation" />
      <Notice kind="danger" title="Virkelige anlegg">
        Øvelsene her gjelder trygge, simulerte lavspenningskretser. Feilsøking og måling på virkelige anlegg eller kretser med farlig spenning skal bare gjøres
        av kvalifisert personell eller under kvalifisert veiledning, med egnet måleinstrument og etter gjeldende sikkerhetsrutiner.
      </Notice>
      <div className="row learn-toolbar">
        <label className="label" htmlFor="ff-scenario">
          Krets
        </label>
        <select id="ff-scenario" className="select" style={{ width: 260 }} value={scenarioId} onChange={(e) => newTask(e.target.value)}>
          <option value="tilfeldig">Tilfeldig krets</option>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <span className="spacer" />
        <ScoreBar score={score} onReset={reset} />
      </div>

      <div className="learn-ff-grid">
        <div className="card">
          <div className="card-title">{task.scenario.title}</div>
          <p className="muted">{task.scenario.description}</p>
          <div className="notice notice-warn">
            <div>
              <strong>Symptom:</strong> {sy.join(', ')}. Det er én feil i kretsen (brudd eller kortslutning). Finn den!
            </div>
          </div>
          <SimDrawing
            elements={task.circuit.elements}
            sim={sim.visual}
            testPoints={task.points}
            highlight={[red, black].filter(Boolean)}
            onTestPointClick={clickPoint}
            maxHeight={360}
          />
          <p className="small muted">Klikk på målepunktene (blå prikker) for å sette målepinnene – annenhver gang rød og svart.</p>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-title">
              <Gauge size={18} /> Virtuelt multimeter (DC V)
            </div>
            <div className="learn-meter" aria-live="polite">
              {reading === null ? '– – –' : `${fmt(reading, 3)} V`}
            </div>
            <div className="field">
              <label htmlFor="ff-red">
                <span className="learn-probe red" /> Rød målepinne (V)
              </label>
              <select id="ff-red" className="select" value={red} onChange={(e) => setRed(e.target.value)}>
                <option value="">Velg punkt …</option>
                {task.points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {task.pointKey[p.id]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ff-black">
                <span className="learn-probe black" /> Svart målepinne (COM)
              </label>
              <select id="ff-black" className="select" value={black} onChange={(e) => setBlack(e.target.value)}>
                <option value="">Velg punkt …</option>
                {task.points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {task.pointKey[p.id]}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn"
              disabled={reading === null}
              onClick={() => reading !== null && setLog((l) => [...l, { a: task.pointKey[red], b: task.pointKey[black], v: reading }])}
            >
              Noter målingen
            </button>
            {log.length > 0 && (
              <>
                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Rød</th>
                      <th>Svart</th>
                      <th>Spenning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((m, i) => (
                      <tr key={i}>
                        <td>{m.a}</td>
                        <td>{m.b}</td>
                        <td className="mono">{fmt(m.v, 3)} V</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-ghost btn-sm" onClick={() => setLog([])}>
                  <Trash2 size={14} /> Tøm målelogg
                </button>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-title">Hvilken komponent har feil?</div>
            <div className="learn-options">
              {candidates.map((c) => {
                let cls = 'learn-option';
                if (guess === c.label) cls += solved ? ' correct' : ' wrong';
                if (solved && c.label === task.fault.label) cls += ' correct';
                return (
                  <button key={c.id} className={cls} onClick={() => answer(c.label)} disabled={solved}>
                    {c.label} – {getSymbol(c.symbolId)?.name}
                  </button>
                );
              })}
            </div>
            {guess && !solved && (
              <div className="notice notice-danger" style={{ marginTop: 10 }}>
                <XCircle size={18} color="var(--danger)" />
                <div>
                  {guess} er ikke feilen. Tips: mål over {guess} – over en hel bryter/sikring/leder som fører strøm er spenningen ca. 0 V, og over en last som får strøm
                  ligger en del av kildespenningen. Prøv igjen (bare første svar teller i poengsummen).
                </div>
              </div>
            )}
            {solved && (
              <div className="notice notice-ok" style={{ marginTop: 10 }}>
                <CheckCircle2 size={18} color="var(--ok)" />
                <div>
                  <strong>
                    Riktig: {faultText} i {task.fault.label}.
                  </strong>{' '}
                  {task.fault.type === 'brudd'
                    ? `Når ${task.fault.label} har brudd, går det ingen strøm gjennom den. De hele komponentene i samme strømvei får da ikke spenningsfall (0 V over dem), mens hele spenningen måles over bruddet.`
                    : `Når ${task.fault.label} er kortsluttet, blir spenningen over den ca. 0 V. Resten av kretsen får dermed høyere spenning og strøm enn normalt.`}
                </div>
              </div>
            )}
            {showHint && !solved && (
              <div className="notice notice-info" style={{ marginTop: 10 }}>
                <Lightbulb size={18} color="var(--warn)" />
                <div>{task.scenario.hint}</div>
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              {!solved && (
                <button className="btn" onClick={() => setShowHint((h) => !h)}>
                  <Lightbulb size={16} /> {showHint ? 'Skjul hint' : 'Vis hint'}
                </button>
              )}
              <span className="spacer" />
              <button className={`btn ${solved ? 'btn-primary' : ''}`} onClick={() => newTask()}>
                Ny feil <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
