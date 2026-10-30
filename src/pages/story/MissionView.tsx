import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, GraduationCap, MapPin, Play, RotateCcw, ShieldAlert, Sparkles, Target, Wrench, XCircle } from 'lucide-react';
import { LessonNotes, LessonView } from './LessonView';
import { SUBJECTS, gradeFromScore } from './content/school';
import type { Effects, Mission, MissionResult, StoryState } from './types';
import { applyEffects, levelInfo, useStory } from './engine';
import { char, loc } from './world';
import { EffectChips } from './EffectChips';
import { DialogueView } from './DialogueView';
import { CalcWs, EditorWs, FaultWs, Game3dWs, MatchWs, MaterialsWs, QuizWs, ReportWs, RiskWs, type WsProps, type WsResult } from './Workspaces';
import { useProjects } from '../../store/projects';

const TYPE_NAME: Record<string, string> = {
  scenario: 'Situasjon',
  match: 'Koble sammen',
  quiz: 'Prøve',
  calc: 'Beregning',
  editor: 'Tegning i ElektroStudio',
  faultfind: 'Feilsøking',
  materials: 'Materialliste',
  risk: 'Risikovurdering',
  report: 'Dokumentasjon',
  game3d: 'Jobb hos kunde (3D)',
};

const DAY_WAGE: Partial<Record<StoryState['stage'], number>> = { laerling1: 700, laerling2: 950, fagarbeider: 1800 };
const WORK_PLACES = ['bedrift', 'byggeplass', 'kunder', 'provested'];

/** Registrerer resultatet av et forsøk: belønning, konsekvens, journal og oppdragsstatistikk */
export function finish(s: StoryState, m: Mission, r: WsResult): StoryState {
  // Skoleoppdrag gir karakter. Godkjent = karakter 3 eller bedre, og XP etter hvor godt det gikk.
  const grade = m.subject ? gradeFromScore(r.score) : undefined;
  const ok = grade !== undefined ? grade >= 3 : r.ok;
  let effects: Effects;
  if (grade !== undefined) {
    const xp = Math.round(((m.reward.xp ?? 0) * r.score) / 100);
    effects = ok
      ? { ...m.reward, xp, days: (m.reward.days ?? 0) + 1, journal: `${m.reward.journal ?? `Leverte «${m.title}».`} Karakter ${grade}.` }
      : { ...(m.failEffects ?? {}), xp, days: 1, journal: `Leverte «${m.title}» – fikk karakter ${grade}.` };
  } else {
    effects = ok
      ? { ...m.reward, days: (m.reward.days ?? 0) + 1, journal: m.reward.journal ?? `Fullførte «${m.title}».` }
      : { ...(m.failEffects ?? {}), days: 1, journal: m.repeatable ? undefined : `«${m.title}» ble ikke godkjent.` };
  }
  // Lærlinger får dagslønn for arbeidsoppdrag (tallene er bare for spillet)
  const wage = DAY_WAGE[s.stage] ?? 0;
  if (ok && wage && WORK_PLACES.includes(m.location) && !m.sideJob) effects.money = (effects.money ?? 0) + wage;
  const before = levelInfo(s.xp).level;
  let n = applyEffects(s, effects);
  const prev = s.missions[m.id] ?? { best: 0, attempts: 0 };
  n = {
    ...n,
    missions: {
      ...n.missions,
      [m.id]: {
        ...prev,
        best: Math.max(prev.best, r.score),
        attempts: prev.attempts + 1,
        // Ett forsøk: oppdraget er gjennomført uansett resultat (ekstrajobber kan tas flere ganger)
        completedAt: ok || !m.repeatable ? Date.now() : prev.completedAt,
        passed: ok || !!prev.passed,
        grade,
        failed: ok ? prev.failed : (prev.failed ?? 0) + 1,
      },
    },
  };
  const after = levelInfo(n.xp).level;
  const a = s.active?.kind === 'mission' ? s.active : undefined;
  const result: MissionResult = { ...r, ok, grade, effects, levelUp: after > before ? after : undefined };
  n.active = { kind: 'mission', id: m.id, phase: 'result', startedAt: a?.startedAt ?? Date.now(), docId: a?.docId, result };
  return n;
}

export function MissionView({ mission: m, state }: { mission: Mission; state: StoryState }) {
  const navigate = useNavigate();
  const update = useStory((x) => x.update);
  const setActive = useStory((x) => x.setActive);
  const a = state.active?.kind === 'mission' && state.active.id === m.id ? state.active : undefined;
  const phase = a?.phase ?? 'brief';
  const giver = char(m.giver);
  const record = state.missions[m.id];

  const [confirmQuit, setConfirmQuit] = useState(false);
  const oneTry = !m.repeatable;

  const close = () => setActive(undefined);
  const startWork = () => setActive({ kind: 'mission', id: m.id, phase: 'work', startedAt: Date.now(), docId: a?.docId ?? record?.docId });
  const startLesson = () => setActive({ kind: 'mission', id: m.id, phase: 'lesson', startedAt: Date.now(), docId: a?.docId ?? record?.docId });
  const onResult = (r: WsResult) => update((s) => finish(s, m, r));
  // Å gå fra en påbegynt oppgave med bare ett forsøk teller som blank levering
  const back = () => {
    if (phase === 'work' && oneTry) setConfirmQuit(true);
    else close();
  };

  const props: WsProps = {
    mission: m,
    state,
    startedAt: a?.startedAt ?? Date.now(),
    docId: a?.docId,
    setDocId: (id) =>
      update((s) =>
        s.active?.kind === 'mission'
          ? { ...s, active: { ...s.active, docId: id }, missions: { ...s.missions, [m.id]: { ...(s.missions[m.id] ?? { best: 0, attempts: 0 }), docId: id } } }
          : s,
      ),
    setProjectId: (id) => update((s) => ({ ...s, projectId: id })),
    onResult,
  };

  const ws = m.workspace;
  let body: React.ReactNode = null;
  if (phase === 'work') {
    switch (ws.type) {
      case 'scenario':
        body = (
          <DialogueView
            nodes={ws.nodes}
            start={ws.start}
            state={state}
            playerName={state.playerName}
            onEffects={(e) => update((s) => applyEffects(s, e))}
            onEnd={(end, last, made) => {
              // Poeng etter hvor mange trygge valg du tok før et eventuelt farlig valg
              const total = Math.max(1, ws.nodes.filter((n) => (n.choices?.length ?? 0) > 1).length);
              const score = end === 'fail' ? Math.round((Math.max(0, made - 1) / total) * 100) : 100;
              onResult({
                ok: end !== 'fail',
                score,
                feedback: end === 'fail' ? [`Du tok ${Math.max(0, made - 1)} av ${total} trygge valg før det farlige.`, last.text] : [last.text],
              });
            }}
          />
        );
        break;
      case 'match':
        body = <MatchWs ws={ws} {...props} />;
        break;
      case 'quiz':
        body = <QuizWs ws={ws} {...props} />;
        break;
      case 'calc':
        body = <CalcWs ws={ws} {...props} />;
        break;
      case 'editor':
        body = <EditorWs ws={ws} {...props} />;
        break;
      case 'faultfind':
        body = <FaultWs ws={ws} {...props} />;
        break;
      case 'materials':
        body = <MaterialsWs ws={ws} {...props} />;
        break;
      case 'risk':
        body = <RiskWs ws={ws} {...props} />;
        break;
      case 'report':
        body = <ReportWs ws={ws} {...props} />;
        break;
      case 'game3d':
        body = <Game3dWs ws={ws} {...props} />;
        break;
    }
  }

  return (
    <div className="mission">
      <div className="mission-head">
        <button className="btn btn-ghost btn-sm" onClick={back}>
          <ArrowLeft size={15} /> {phase === 'work' && oneTry ? 'Gi opp' : 'Tilbake'}
        </button>
        <div className="mission-title">
          <div className="small muted">
            <MapPin size={12} /> {loc(m.location)?.name} · {TYPE_NAME[ws.type]}
            {m.sideJob && ' · Ekstrajobb'}
          </div>
          <h2>{m.title}</h2>
        </div>
        <div className="mission-steps">
          {(m.lesson ? (['brief', 'lesson', 'work', 'result'] as const) : (['brief', 'work', 'result'] as const)).map((p, i) => (
            <span key={p} className={`mstep ${phase === p ? 'on' : ''}`}>
              {i + 1}. {{ brief: 'Oppdrag', lesson: 'Undervisning', work: 'Arbeid', result: 'Resultat' }[p]}
            </span>
          ))}
        </div>
      </div>

      {confirmQuit && (
        <div className="notice notice-danger">
          <div>
            <b>Gi opp oppgaven?</b> Du har bare ett forsøk. Går du nå, teller det som blank levering{m.subject ? ' (karakter 1)' : ''}.
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-sm" onClick={() => setConfirmQuit(false)}>
                Nei, jeg fortsetter
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setConfirmQuit(false);
                  onResult({ ok: false, score: 0, feedback: ['Oppgaven ble levert blank.'] });
                }}
              >
                Ja, lever blankt
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'brief' && (
        <div className="mission-brief">
          <div className="brief-story">
            {giver && (
              <div className="dlg-avatar big" style={{ background: giver.color }} title={giver.role}>
                {giver.avatar}
              </div>
            )}
            <div>
              {giver && (
                <div className="dlg-name" style={{ color: giver.color }}>
                  {giver.name} <span className="dlg-role">· {giver.role}</span>
                </div>
              )}
              <p>{m.story}</p>
              {m.intro?.map((l, i) => {
                const c = char(l.speaker);
                return (
                  <p key={i} className="brief-line">
                    <b style={{ color: c?.color }}>{l.speaker === 'deg' ? state.playerName : c?.name ?? ''}:</b> {l.text}
                  </p>
                );
              })}
            </div>
          </div>
          <div className="brief-grid">
            <div className="brief-box">
              <div className="brief-h">
                <Target size={15} /> Mål
              </div>
              <p>{m.goal}</p>
            </div>
            <div className="brief-box">
              <div className="brief-h">
                <Wrench size={15} /> Verktøy og komponenter
              </div>
              <ul>
                {m.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                {m.components?.map((t) => (
                  <li key={t} className="muted">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="brief-box">
              <div className="brief-h">
                <Sparkles size={15} /> Belønning
              </div>
              <EffectChips e={m.reward} />
              {m.subject && (
                <div className="small" style={{ marginTop: 6 }}>
                  Gir karakter i <b>{SUBJECTS.find((x) => x.id === m.subject)?.name}</b>
                </div>
              )}
              {record && m.repeatable && (
                <div className="small muted" style={{ marginTop: 6 }}>
                  Tatt {record.attempts} gang(er)
                </div>
              )}
            </div>
          </div>
          {m.safety && (
            <div className="notice notice-warn small">
              <ShieldAlert size={15} /> <b>Sikkerhet:</b> {m.safety}
            </div>
          )}
          {oneTry && (
            <div className="notice notice-warn small">
              <AlertTriangle size={15} /> <b>Ett forsøk.</b> Når du leverer, er det endelig{m.subject ? ' – resultatet blir karakteren din (1–6)' : ''}. Følg godt med
              {m.lesson ? ' i undervisningen' : ''}, og bruk den tiden du trenger.
            </div>
          )}
          <div className="row">
            {m.lesson ? (
              <button className="btn btn-primary" onClick={startLesson} autoFocus>
                <GraduationCap size={16} /> Gå til undervisningen
              </button>
            ) : (
              <button className="btn btn-primary" onClick={startWork} autoFocus>
                <Play size={16} /> Start oppdraget
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'lesson' && m.lesson && <LessonView lesson={m.lesson} onDone={startWork} />}

      {phase === 'work' && (
        <div className="mission-work">
          <div className="work-goal">
            <Target size={14} /> {m.goal}
          </div>
          {m.lesson && ws.type !== 'quiz' && <LessonNotes lesson={m.lesson} />}
          {m.lesson && ws.type === 'quiz' && <div className="small muted">Prøve – notatene fra timen er ikke tillatt.</div>}
          {body}
        </div>
      )}

      {phase === 'result' && a?.result && (
        <div className={`mission-result ${a.result.ok ? 'ok' : 'fail'}`}>
          <div className="result-head">
            {a.result.grade !== undefined ? (
              <div className={`grade-badge g${a.result.grade}`}>{a.result.grade}</div>
            ) : a.result.ok ? (
              <CheckCircle2 size={34} />
            ) : (
              <XCircle size={34} />
            )}
            <div>
              <h3>
                {a.result.grade !== undefined
                  ? `Karakter ${a.result.grade} i ${SUBJECTS.find((x) => x.id === m.subject)?.name}`
                  : a.result.ok
                    ? 'Oppdrag fullført!'
                    : 'Ikke godkjent'}
              </h3>
              <div className="small muted">
                Resultat: {a.result.score} %{oneTry ? ' · levert – kan ikke tas på nytt' : ''}
              </div>
            </div>
          </div>
          {a.result.grade === 1 && (
            <div className="notice notice-danger small">Karakter 1 trekker kraftig ned i faget. Står du med 1 i et fag når året er over, må du ta skoleåret på nytt.</div>
          )}
          <p className="result-outro">
            {giver && <b style={{ color: giver.color }}>{giver.name}: </b>}
            {a.result.ok ? m.outro.success : m.outro.fail}
          </p>
          {a.result.feedback.length > 0 && (
            <ul className="result-feedback">
              {a.result.feedback.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          {a.result.effects && <EffectChips e={a.result.effects} big />}
          {a.result.levelUp && (
            <div className="levelup">
              <Sparkles size={18} /> Du gikk opp til nivå {a.result.levelUp}!
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            {a.result.link && (
              <button
                className="btn"
                onClick={async () => {
                  if (state.projectId) await useProjects.getState().open(state.projectId);
                  navigate(a.result!.link!.to);
                }}
              >
                {a.result.link.label}
              </button>
            )}
            {m.repeatable && (
              <button className="btn" onClick={startWork}>
                <RotateCcw size={16} /> Ta jobben en gang til
              </button>
            )}
            <button className="btn btn-primary" onClick={close}>
              Tilbake til {loc(m.location)?.name ?? 'kartet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
