import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Gauge, Play, RotateCcw } from 'lucide-react';
import type { ComponentEl, DrawingDoc } from '../../types';
import type {
  CalcWorkspace,
  EditorWorkspace,
  FaultWorkspace,
  Game3dWorkspace,
  MatchWorkspace,
  MaterialsWorkspace,
  Mission,
  QuizWorkspace,
  ReportWorkspace,
  RiskWorkspace,
  StoryState,
} from './types';
import { SymbolIcon } from '../../editor/SymbolIcon';
import { StaticDrawing } from '../../editor/StaticDrawing';
import { getSymbol } from '../../library/symbols';
import { emptySimState, simulate, type SimState } from '../../sim/solver';
import { terminalsOf } from '../../editor/geometry';
import { SimDrawing, type TestPoint } from '../learn/SimDrawing';
import { QuizCard } from '../learn/QuizCard';
import { shuffle } from '../learn/progress';
import { CIRCUITS, PLANS, findByLabel } from './circuits';
import { CHECKERS } from './checkers';
import { EDITOR_BANNER_KEY } from './StoryBanner';
import { projectRepo } from '../../storage';
import { newProject, newReport, newDoc } from '../../store/factories';
import { useProjects } from '../../store/projects';
import { fmt, parseNum, uid } from '../../utils/id';

export interface WsResult {
  ok: boolean;
  score: number;
  feedback: string[];
  /** Lenke som vises i resultatet (f.eks. til rapporten som ble lagret) */
  link?: { label: string; to: string };
}

export interface WsProps {
  mission: Mission;
  state: StoryState;
  startedAt: number;
  docId?: string;
  setDocId: (id: string) => void;
  setProjectId: (id: string) => void;
  onResult: (r: WsResult) => void;
}

// ---------------------------------------------------------------------------
// Koble sammen (verktøy, symboler, varer)
// ---------------------------------------------------------------------------
export function MatchWs({ ws, mission, onResult }: { ws: MatchWorkspace } & WsProps) {
  const answers = useMemo(() => shuffle([...new Set([...ws.pairs.map((p) => p.answer), ...(ws.distractors ?? [])])]), [ws]);
  const [sel, setSel] = useState<Record<number, string>>({});
  const need = Math.max(1, ws.pairs.length - 1);
  const submit = () => {
    const right = ws.pairs.filter((p, i) => sel[i] === p.answer).length;
    const wrong = ws.pairs.filter((p, i) => sel[i] !== p.answer).map((p) => `${p.item}: riktig svar er «${p.answer}».`);
    onResult({ ok: right >= need, score: Math.round((right / ws.pairs.length) * 100), feedback: [`${right} av ${ws.pairs.length} riktige${mission.subject ? '' : ` (minst ${need} kreves)`}.`, ...wrong] });
  };
  return (
    <div>
      <p className="ws-prompt">{ws.prompt}</p>
      <div className="match-list">
        {ws.pairs.map((p, i) => (
          <div key={i} className="match-row">
            <div className="match-item">
              {p.symbol ? (
                <span className="match-symbol">
                  <SymbolIcon symbolId={p.symbol} size={46} color="#d6e4ff" />
                </span>
              ) : null}
              <b>{p.item}</b>
            </div>
            <select className="select" value={sel[i] ?? ''} onChange={(e) => setSel((s) => ({ ...s, [i]: e.target.value }))}>
              <option value="">Velg …</option>
              {answers.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" disabled={Object.keys(sel).length < ws.pairs.length} onClick={submit}>
        <CheckCircle2 size={16} /> Kontroller
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------
export function QuizWs({ ws, mission, onResult }: { ws: QuizWorkspace } & WsProps) {
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongTexts, setWrong] = useState<string[]>([]);
  const q = ws.questions[i];
  const options = useMemo(() => shuffle(q.options.map((label, k) => ({ id: String(k), label }))), [q]);
  return (
    <div>
      <div className="row small muted" style={{ marginBottom: 8 }}>
        Spørsmål {i + 1} av {ws.questions.length} {mission.subject ? '' : ` · ${right} riktige · trenger ${ws.need}`}
      </div>
      <QuizCard
        key={i}
        question={q.q}
        options={options}
        correctId="0"
        hint={q.hint}
        explanation={q.explanation}
        onAnswered={(ok) => {
          if (ok) setRight((r) => r + 1);
          else setWrong((w) => [...w, `${q.q} → ${q.options[0]}`]);
        }}
        onNext={() => {
          if (i + 1 < ws.questions.length) setI(i + 1);
          else {
            const total = right;
            onResult({ ok: total >= ws.need, score: Math.round((total / ws.questions.length) * 100), feedback: [`${total} av ${ws.questions.length} riktige.`, ...wrongTexts.map((w) => `Riktig svar: ${w}`)] });
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Beregninger
// ---------------------------------------------------------------------------
export function CalcWs({ ws, onResult }: { ws: CalcWorkspace } & WsProps) {
  const [vals, setVals] = useState<string[]>(ws.tasks.map(() => ''));
  const [hints, setHints] = useState<Record<number, boolean>>({});
  const submit = () => {
    const fb: string[] = [];
    let right = 0;
    ws.tasks.forEach((t, i) => {
      const v = parseNum(vals[i]);
      const tol = t.tol ?? 0.02;
      const ok = Number.isFinite(v) && (tol === 0 ? Math.abs(v - t.answer) < 1e-9 : Math.abs(v - t.answer) <= Math.abs(t.answer) * tol + 1e-9);
      if (ok) right++;
      else fb.push(`Oppgave ${i + 1}: ${t.explanation}`);
    });
    onResult({ ok: right === ws.tasks.length, score: Math.round((right / ws.tasks.length) * 100), feedback: [`${right} av ${ws.tasks.length} riktige.`, ...fb] });
  };
  return (
    <div className="calc-tasks">
      {ws.tasks.map((t, i) => (
        <div key={i} className="calc-task">
          <div className="calc-q">
            <b>{i + 1}.</b> {t.q}
          </div>
          <div className="row">
            <div className="input-unit" style={{ maxWidth: 220 }}>
              <input className="input" inputMode="decimal" value={vals[i]} onChange={(e) => setVals((v) => v.map((x, k) => (k === i ? e.target.value : x)))} placeholder="Svar" />
              <span>{t.unit}</span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setHints((h) => ({ ...h, [i]: true }))}>
              Hint
            </button>
            {hints[i] && <span className="small muted">{t.hint}</span>}
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={submit} disabled={vals.some((v) => v.trim() === '')}>
        <CheckCircle2 size={16} /> Kontroller svarene
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Åpne ekte verktøy (tegning, skjema, plantegning, simulator)
// ---------------------------------------------------------------------------

async function ensureStoryProject(state: StoryState): Promise<string> {
  if (state.projectId && (await projectRepo.get(state.projectId))) return state.projectId;
  const p = newProject(`Story Mode – ${state.playerName}`, 'Tegninger og rapporter fra oppdragene i Story Mode.');
  await projectRepo.save(p);
  await useProjects.getState().refresh();
  return p.id;
}

export function EditorWs({ ws, mission, state, docId, setDocId, setProjectId, onResult }: { ws: EditorWorkspace } & WsProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!docId || !state.projectId) return setExists(false);
      const p = await projectRepo.get(state.projectId);
      if (alive) setExists(!!p?.docs.some((d) => d.id === docId));
    })();
    return () => {
      alive = false;
    };
  }, [docId, state.projectId]);

  const open = async () => {
    setBusy(true);
    try {
      await useProjects.getState().flush();
      const pid = await ensureStoryProject(state);
      setProjectId(pid);
      const proj = await projectRepo.get(pid);
      let id = docId && proj?.docs.some((d) => d.id === docId) ? docId : undefined;
      if (!id && proj) {
        const d: DrawingDoc = newDoc(ws.kind, ws.docName, ws.mode);
        proj.docs.push(d);
        proj.updatedAt = Date.now();
        await projectRepo.save(proj);
        id = d.id;
        setDocId(id);
      }
      try {
        localStorage.setItem(EDITOR_BANNER_KEY, JSON.stringify({ docId: id, title: mission.title, goal: mission.goal, instructions: ws.instructions }));
      } catch {
        /* ignorer */
      }
      // Last prosjektet på nytt i appen slik at tegneverktøyet ser den nye tegningen
      useProjects.setState({ current: null });
      await useProjects.getState().open(pid);
      navigate(`/prosjekt/${pid}/tegning/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await useProjects.getState().flush();
      const proj = state.projectId ? await projectRepo.get(state.projectId) : undefined;
      const doc = proj?.docs.find((d) => d.id === docId);
      // Manglende tegning er ikke et forsøk – gi beskjed i stedet
      if (!doc) return setMsg('Fant ikke tegningen. Åpne verktøyet og lag den først.');
      const r = CHECKERS[ws.checker]?.(doc);
      if (!r) return setMsg(`Ukjent kontroll: ${ws.checker}`);
      onResult({ ...r, link: { label: 'Åpne tegningen', to: `/prosjekt/${proj!.id}/tegning/${doc.id}` } });
    } finally {
      setBusy(false);
    }
  };
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <ol className="ws-steps">
        {ws.instructions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="row">
        <button className="btn btn-primary" onClick={open} disabled={busy}>
          <ExternalLink size={16} /> {exists ? 'Fortsett i verktøyet' : 'Åpne verktøyet'}
        </button>
        {confirm ? (
          <>
            <span className="small">Levere tegningen nå? Det er endelig.</span>
            <button className="btn btn-primary" onClick={verify} disabled={busy}>
              <CheckCircle2 size={16} /> Ja, lever
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>
              Ikke ennå
            </button>
          </>
        ) : (
          <button className="btn" onClick={() => (mission.repeatable ? verify() : setConfirm(true))} disabled={busy || !exists}>
            <CheckCircle2 size={16} /> Lever tegningen
          </button>
        )}
      </div>
      {msg && <div className="notice notice-warn small" style={{ marginTop: 8 }}>{msg}</div>}
      <p className="small muted" style={{ marginTop: 8 }}>
        Tips: Bruk «Simuler» i verktøyet for å teste kretsen selv før du leverer. Du har bare ett forsøk.
      </p>
      <p className="small muted" style={{ marginTop: 8 }}>
        Tegningen lagres i prosjektet «Story Mode – {state.playerName}». I verktøyet finner du en knapp for å komme tilbake hit.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feilsøking i simulert krets
// ---------------------------------------------------------------------------
export function FaultWs({ ws, onResult }: { ws: FaultWorkspace } & WsProps) {
  const elements = useMemo(() => CIRCUITS[ws.circuit].build(), [ws.circuit]);
  const faulty = useMemo(() => findByLabel(elements, ws.fault.label, ws.fault.symbol), [elements, ws.fault]);
  const controls = elements.filter((e): e is ComponentEl => e.type === 'component' && ['switch', 'pushbutton', 'changeover'].includes(getSymbol(e.symbolId)?.sim ?? ''));
  const [sim, setSim] = useState<SimState>(() => {
    const st = emptySimState();
    // Brytere står lukket fra start, slik symptomet beskriver
    for (const c of controls) if (getSymbol(c.symbolId)?.sim === 'switch') st.switches[c.id] = true;
    st.faults = faulty ? { [faulty.id]: ws.fault.kind } : {};
    return st;
  });
  const result = useMemo(() => simulate(elements, sim), [elements, sim]);
  useEffect(() => {
    if (Object.keys(result.coils).some((k) => !!result.coils[k] !== !!sim.coils?.[k])) setSim((s) => ({ ...s, coils: result.coils }));
  }, [result, sim.coils]);

  // Ett målepunkt per nett
  const points: (TestPoint & { net: number })[] = useMemo(() => {
    const seen = new Set<number>();
    const out: (TestPoint & { net: number })[] = [];
    for (const e of elements) {
      if (e.type !== 'component') continue;
      for (const t of terminalsOf(e)) {
        const net = result.netlist.netOfTerminal.get(`${e.id}:${t.id}`);
        if (net === undefined || seen.has(net)) continue;
        seen.add(net);
        out.push({ id: `p${out.length}`, label: String.fromCharCode(65 + out.length), pt: { x: t.x, y: t.y }, net });
      }
    }
    return out;
  }, [elements, result.netlist]);
  const [probe, setProbe] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');

  const clickPoint = (id: string) => {
    const next = probe.length >= 2 ? [id] : [...probe, id];
    setProbe(next);
    if (next.length === 2) {
      const a = points.find((p) => p.id === next[0])!;
      const b = points.find((p) => p.id === next[1])!;
      const u = result.netVoltage[a.net] - result.netVoltage[b.net];
      setLog((l) => [`${a.label}–${b.label}: ${fmt(Math.abs(u) < 0.005 ? 0 : u, 3)} V`, ...l].slice(0, 8));
    }
  };

  const submit = () => {
    const c = ws.candidates[Number(answer)];
    const target = c ? findByLabel(elements, c.label, c.symbol) : undefined;
    const ok = !!target && target.id === faulty?.id;
    const measured = log.length;
    onResult({
      ok,
      score: ok ? (measured >= 2 ? 100 : 70) : 0,
      feedback: ok
        ? [measured >= 2 ? `Riktig – og du målte deg fram (${measured} målinger). Slik jobber en fagperson.` : 'Riktig, men neste gang bør du måle deg fram i stedet for å gjette.']
        : ['Det var ikke riktig komponent. Mål mellom punktene: der det er brudd, ligger spenningen over bruddstedet.'],
    });
  };

  return (
    <div className="fault-ws">
      <div className="notice notice-warn small">Symptom: {ws.symptom}</div>
      <div className="fault-grid">
        <div className="fault-drawing">
          <SimDrawing elements={elements} sim={result.visual} testPoints={points} highlight={probe} onTestPointClick={clickPoint} maxHeight={340} />
          <div className="row small" style={{ marginTop: 6 }}>
            {controls.map((c) => {
              const role = getSymbol(c.symbolId)?.sim;
              if (role === 'pushbutton')
                return (
                  <button
                    key={c.id}
                    className={`btn btn-sm ${sim.pressed[c.id] ? 'btn-primary' : ''}`}
                    onPointerDown={() => setSim((s) => ({ ...s, pressed: { ...s.pressed, [c.id]: true } }))}
                    onPointerUp={() => setSim((s) => ({ ...s, pressed: { ...s.pressed, [c.id]: false } }))}
                    onPointerLeave={() => sim.pressed[c.id] && setSim((s) => ({ ...s, pressed: { ...s.pressed, [c.id]: false } }))}
                  >
                    Hold {c.label}
                  </button>
                );
              const closed = role === 'changeover' ? !!sim.switches[c.id] : sim.switches[c.id] ?? false;
              return (
                <button key={c.id} className="btn btn-sm" onClick={() => setSim((s) => ({ ...s, switches: { ...s.switches, [c.id]: !closed } }))}>
                  {c.label}: {role === 'changeover' ? (closed ? 'stilling 2' : 'stilling 1') : closed ? 'lukket' : 'åpen'}
                </button>
              );
            })}
            <button className="btn btn-sm btn-ghost" onClick={() => setSim((s) => ({ ...emptySimState(), faults: s.faults, switches: Object.fromEntries(controls.filter((c) => getSymbol(c.symbolId)?.sim === 'switch').map((c) => [c.id, true])) }))}>
              <RotateCcw size={13} /> Nullstill
            </button>
          </div>
        </div>
        <div className="fault-side">
          <div className="meter-box">
            <div className="meter-title">
              <Gauge size={15} /> Multimeter (V DC)
            </div>
            <div className="meter-display">{log[0]?.split(': ')[1] ?? '— —'}</div>
            <div className="small muted">Klikk på to målepunkter (A, B, C …) i skjemaet.</div>
            <div className="meter-log">
              {log.map((l, i) => (
                <div key={i} className="mono small">
                  {l}
                </div>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="label">Hvilken komponent er defekt?</span>
            <select className="select" value={answer} onChange={(e) => setAnswer(e.target.value)}>
              <option value="">Velg …</option>
              {ws.candidates.map((c, i) => (
                <option key={i} value={i}>
                  {c.text}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" disabled={answer === ''} onClick={submit}>
            <CheckCircle2 size={16} /> Lever svar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Materialliste fra plantegning
// ---------------------------------------------------------------------------
export function MaterialsWs({ ws, onResult }: { ws: MaterialsWorkspace } & WsProps) {
  const doc = useMemo(() => PLANS[ws.plan].build(), [ws.plan]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const submit = () => {
    const fb: string[] = [];
    let right = 0;
    for (const it of ws.items) {
      const v = parseNum(vals[it.name] ?? '');
      const ok = Number.isFinite(v) && Math.abs(v - it.expected) <= (it.tol ?? 0) + 1e-9;
      if (ok) right++;
      else fb.push(`${it.name}: du skrev ${vals[it.name] || '–'}, riktig er ${it.expected} ${it.unit}.`);
    }
    onResult({ ok: right === ws.items.length, score: Math.round((right / ws.items.length) * 100), feedback: [`${right} av ${ws.items.length} linjer riktige.`, ...fb] });
  };
  return (
    <div className="materials-ws">
      <p className="ws-prompt">{ws.description}</p>
      <div className="plan-view">
        <StaticDrawing doc={doc} projectName="" ink="#d6e4ff" paper="transparent" withBackground={false} style={{ width: '100%', height: '100%' }} />
      </div>
      <table className="table" style={{ maxWidth: 520 }}>
        <thead>
          <tr>
            <th>Komponent</th>
            <th style={{ width: 140 }}>Antall</th>
          </tr>
        </thead>
        <tbody>
          {ws.items.map((it) => (
            <tr key={it.name}>
              <td>{it.name}</td>
              <td>
                <div className="input-unit">
                  <input className="input" inputMode="numeric" value={vals[it.name] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [it.name]: e.target.value }))} />
                  <span>{it.unit}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={submit} disabled={ws.items.some((it) => !(vals[it.name] ?? '').trim())}>
        <CheckCircle2 size={16} /> Kontroller materiallisten
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risikovurdering
// ---------------------------------------------------------------------------
export function RiskWs({ ws, mission, onResult }: { ws: RiskWorkspace } & WsProps) {
  const hazards = useMemo(() => shuffle(ws.hazards), [ws]);
  const [rel, setRel] = useState<Record<string, boolean>>({});
  const [meas, setMeas] = useState<Record<string, string>>({});
  const submit = () => {
    const fb: string[] = [];
    let points = 0;
    let max = 0;
    for (const h of ws.hazards) {
      max += h.relevant ? 2 : 1;
      if (!!rel[h.id] !== h.relevant) {
        fb.push(h.relevant ? `«${h.text}» er en reell fare i dette arbeidet.` : `«${h.text}» er ikke relevant her.`);
        continue;
      }
      points++;
      if (h.relevant) {
        if (meas[h.id] === h.measure) points++;
        else fb.push(`Tiltak for «${h.text}»: ${h.measure}.`);
      }
    }
    const score = Math.round((points / max) * 100);
    onResult({ ok: score >= 85, score, feedback: [`Poeng: ${points} av ${max}${mission.subject ? '' : ' (minst 85 % kreves)'}.`, ...fb] });
  };
  return (
    <div className="risk-ws">
      <div className="notice notice-info small">
        <b>Arbeid:</b> {ws.activity}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Mulig fare</th>
            <th style={{ width: 90 }}>Relevant?</th>
            <th>Tiltak</th>
          </tr>
        </thead>
        <tbody>
          {hazards.map((h) => (
            <tr key={h.id}>
              <td>{h.text}</td>
              <td>
                <input type="checkbox" checked={!!rel[h.id]} onChange={(e) => setRel((r) => ({ ...r, [h.id]: e.target.checked }))} aria-label={`${h.text} er relevant`} />
              </td>
              <td>
                {rel[h.id] ? (
                  <select className="select" value={meas[h.id] ?? ''} onChange={(e) => setMeas((m) => ({ ...m, [h.id]: e.target.value }))}>
                    <option value="">Velg tiltak …</option>
                    {ws.measures.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <span className="small muted">–</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={submit}>
        <CheckCircle2 size={16} /> Lever risikovurderingen
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dokumentasjon (rapport)
// ---------------------------------------------------------------------------
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function ReportWs({ ws, mission, state, setProjectId, onResult }: { ws: ReportWorkspace } & WsProps) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [meas, setMeas] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const fb: string[] = [];
    let ok = true;
    for (const f of ws.fields) {
      const v = vals[f.key] ?? '';
      if (words(v) < f.minWords) {
        ok = false;
        fb.push(`«${f.label}» er for kort (${words(v)} av minst ${f.minWords} ord).`);
      }
      const miss = (f.mustMention ?? []).filter((w) => !v.toLowerCase().includes(w.toLowerCase()));
      if (miss.length) {
        ok = false;
        fb.push(`«${f.label}» bør nevne: ${miss.join(', ')}.`);
      }
    }
    (ws.measurements ?? []).forEach((m, i) => {
      const v = parseNum(meas[i] ?? '');
      if (!Number.isFinite(v) || Math.abs(v - m.expected) > Math.abs(m.expected) * (m.tol ?? 0.01) + 1e-9) {
        ok = false;
        fb.push(`Måleverdi «${m.point}» er ikke ført riktig fra protokollen (${m.given}).`);
      }
    });
    let link: WsResult['link'];
    if (ok && ws.saveAsReport) {
      setBusy(true);
      try {
        const pid = await ensureStoryProject(state);
        setProjectId(pid);
        const proj = await projectRepo.get(pid);
        if (proj) {
          const rep = newReport('skole', state.playerName, '');
          rep.title = mission.title;
          const put = (title: string, text: string) => {
            const sec = rep.sections.find((s) => s.title.toLowerCase() === title.toLowerCase());
            if (sec) sec.text = text;
            else rep.sections.push({ id: uid('sec'), title, kind: 'text', text });
          };
          for (const f of ws.fields) put(f.label, vals[f.key] ?? '');
          if (ws.measurements?.length) {
            const sec = rep.sections.find((s) => s.title === 'Måleresultater');
            if (sec) sec.rows = ws.measurements.map((m, i) => [m.point, '', '', meas[i] ?? '', m.unit, '']);
          }
          proj.reports.push(rep);
          proj.updatedAt = Date.now();
          await projectRepo.save(proj);
          if (useProjects.getState().current?.id === pid) useProjects.setState({ current: proj });
          link = { label: 'Åpne rapporten i Dokumentasjon', to: `/dokumentasjon/${rep.id}` };
          fb.push('Rapporten er lagret i prosjektet «Story Mode». Du kan eksportere den til PDF fra Dokumentasjon.');
        }
      } finally {
        setBusy(false);
      }
    }
    onResult({ ok, score: ok ? 100 : 30, feedback: ok ? ['Rapporten er fullstendig.', ...fb] : fb, link });
  };
  return (
    <div className="report-ws">
      <div className="notice notice-info small">{ws.context}</div>
      {ws.fields.map((f) => (
        <label key={f.key} className="field">
          <span className="label">
            {f.label} <span className="muted">(minst {f.minWords} ord – {words(vals[f.key] ?? '')} skrevet)</span>
          </span>
          <textarea className="textarea" rows={3} placeholder={f.placeholder} value={vals[f.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
        </label>
      ))}
      {ws.measurements?.length ? (
        <>
          <div className="label" style={{ marginTop: 6 }}>
            Måleresultater (før inn verdiene fra måleprotokollen)
          </div>
          <table className="table" style={{ maxWidth: 640 }}>
            <thead>
              <tr>
                <th>Målepunkt</th>
                <th>Protokoll</th>
                <th style={{ width: 150 }}>Verdi</th>
              </tr>
            </thead>
            <tbody>
              {ws.measurements.map((m, i) => (
                <tr key={i}>
                  <td>{m.point}</td>
                  <td className="small muted">{m.given}</td>
                  <td>
                    <div className="input-unit">
                      <input className="input" inputMode="decimal" value={meas[i] ?? ''} onChange={(e) => setMeas((x) => ({ ...x, [i]: e.target.value }))} />
                      <span>{m.unit}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={submit}>
        <CheckCircle2 size={16} /> Lever dokumentasjonen
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jobb i 3D-spillet
// ---------------------------------------------------------------------------
const DROVE_KEY = 'elektrostudio-story-drove';

export function Game3dWs({ ws, mission, startedAt, onResult }: { ws: Game3dWorkspace } & WsProps) {
  const navigate = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  // Ett forsøk: man kan kjøre ut til kunden én gang per oppdrag
  let drove = false;
  try {
    drove = localStorage.getItem(DROVE_KEY) === `${mission.id}:${startedAt}`;
  } catch {
    /* ignorer */
  }
  const drive = () => {
    try {
      localStorage.setItem(DROVE_KEY, `${mission.id}:${startedAt}`);
    } catch {
      /* ignorer */
    }
    navigate(`/spill?level=${ws.level}&story=1`);
  };
  const verify = () => {
    if (!drove && !mission.repeatable) return setMsg('Du har ikke vært hos kunden ennå. Trykk «Kjør ut til kunden» først.');
    let rec: { stars?: number; lastWin?: number } | undefined;
    try {
      rec = JSON.parse(localStorage.getItem('elektrostudio-game-progress') || '{}')[ws.level];
    } catch {
      rec = undefined;
    }
    const need = ws.minStars ?? 1;
    if (!rec?.lastWin || rec.lastWin < startedAt) {
      if (mission.repeatable) return setMsg('Jobben er ikke fullført ennå. Kjør til kunden og få lys i alle rom.');
      return onResult({ ok: false, score: 0, feedback: ['Du dro fra kunden uten å bli ferdig. Jobben ble ikke levert.'] });
    }
    const stars = (rec as { lastStars?: number }).lastStars ?? rec.stars ?? 0;
    if (stars < need) return onResult({ ok: false, score: 40, feedback: [`Du fikk ${stars} stjerne(r), men sjefen forventet minst ${need}. Sikkerhetsbrudd og mange hint trekker ned.`] });
    onResult({ ok: true, score: Math.round((stars / 3) * 100), feedback: [`Jobben er utført med ${stars} stjerne(r).`] });
  };
  return (
    <div>
      <p className="ws-prompt">
        Jobben utføres i Elektrikerspillet (3D). Når kunden har lys i alle rom, kommer du tilbake hit og leverer.
        {!mission.repeatable && ' Du kan bare kjøre ut én gang – går du fra kunden før jobben er ferdig, blir den ikke godkjent.'}
      </p>
      <div className="row">
        <button className="btn btn-primary" onClick={drive} disabled={drove && !mission.repeatable}>
          <Play size={16} /> {drove ? 'Du har vært hos kunden' : 'Kjør ut til kunden'}
        </button>
        <button className="btn" onClick={verify}>
          <CheckCircle2 size={16} /> Lever jobben
        </button>
      </div>
      {msg && <div className="notice notice-warn small" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
