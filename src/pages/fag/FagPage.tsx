import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Heart, Lightbulb, RotateCcw, School, XCircle } from 'lucide-react';
import { PageHeader, SafetyNotice } from '../../components/ui';
import { LessonView } from '../story/LessonView';
import { LESSONS } from '../story/content/lessons';
import { SUBJECTS, SUBJECT_OF, gradeFromScore } from '../story/content/school';
import { pickN, shuffle } from '../learn/progress';
import type { Bank, FagQuestion, Level, Subject } from './types';
import { YFF } from './bank-yff';
import { ELKRETSER } from './bank-elkretser';
import { STYRESYSTEMER } from './bank-styresystemer';
import '../learn/learn.css';
import '../story/story.css';
import './fag.css';

const BANKS: Record<Subject, Bank> = { yff: YFF, elkretser: ELKRETSER, styresystemer: STYRESYSTEMER };

const ABOUT: Record<Subject, { icon: string; text: string }> = {
  yff: { icon: '🦺', text: 'HMS, sikker jobbing, verktøy, måleinstrumenter, materialer og arbeidslivet som lærling.' },
  elkretser: { icon: '⚡', text: 'Ohms lov, effekt, serie og parallell, vekselstrøm, trefase, skjema, vern og feilsøking.' },
  styresystemer: { icon: '🎛️', text: 'Releer, kontaktorer, selvhold, motorstyring, forrigling, sensorer, logikk og PLS.' },
};

interface LevelDef {
  id: Level;
  name: string;
  icon: string;
  count: number;
  /** Antall svaralternativer som vises */
  options: number;
  hint: boolean;
  /** Sekunder per spørsmål (0 = ingen tidsfrist) */
  time: number;
  /** Antall liv (0 = ubegrenset) */
  lives: number;
}

const LEVELS: LevelDef[] = [
  { id: 'lett', name: 'Lett', icon: '🟢', count: 8, options: 3, hint: true, time: 0, lives: 0 },
  { id: 'middels', name: 'Middels', icon: '🟡', count: 10, options: 4, hint: true, time: 0, lives: 0 },
  { id: 'vanskelig', name: 'Vanskelig', icon: '🟠', count: 10, options: 4, hint: false, time: 45, lives: 0 },
  { id: 'super', name: 'Supervanskelig', icon: '🔴', count: 12, options: 4, hint: false, time: 25, lives: 3 },
];

const levelText = (l: LevelDef) =>
  [
    `${l.count} spørsmål`,
    `${l.options} svaralternativer`,
    l.hint ? 'hint tilgjengelig' : 'ingen hint',
    l.time ? `${l.time} sekunder per spørsmål` : 'ingen tidsfrist',
    l.lives ? `${l.lives} liv – tre feil og quizen er over` : '',
  ]
    .filter(Boolean)
    .join(' · ');

// Lagring -----------------------------------------------------------------
const BEST_KEY = 'elektrostudio-fag-best';
const READ_KEY = 'elektrostudio-fag-lest';
type Best = Record<string, { grade: number; pct: number }>;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* lagring utilgjengelig */
  }
}

// Quiz-runde ----------------------------------------------------------------
interface Asked {
  q: FagQuestion;
  shown: string[];
  chosen: string | null;
  timedOut: boolean;
}

function makeRound(subject: Subject, level: LevelDef): Asked[] {
  const pool = BANKS[subject][level.id];
  return pickN(pool, Math.min(level.count, pool.length)).map((q) => {
    const wrong = shuffle(q.options.slice(1)).slice(0, level.options - 1);
    return { q, shown: shuffle([q.options[0], ...wrong]), chosen: null, timedOut: false };
  });
}

const isRight = (a: Asked) => a.chosen === a.q.options[0];

function Quiz({ subject, level, onExit }: { subject: Subject; level: LevelDef; onExit: () => void }) {
  const [round, setRound] = useState(() => makeRound(subject, level));
  const [i, setI] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [left, setLeft] = useState(level.time);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState<{ grade: number; pct: number; record: boolean } | null>(null);

  const cur = round[i];
  const answered = cur ? cur.chosen !== null || cur.timedOut : false;
  const wrongSoFar = round.filter((a) => (a.chosen !== null || a.timedOut) && !isRight(a)).length;
  const livesLeft = level.lives ? Math.max(0, level.lives - wrongSoFar) : 0;
  const outOfLives = level.lives > 0 && livesLeft === 0;

  const answer = (o: string | null) => {
    if (answered) return;
    setRound((r) => r.map((a, k) => (k === i ? { ...a, chosen: o, timedOut: o === null } : a)));
  };

  // Nedtelling per spørsmål
  useEffect(() => {
    if (!level.time || answered || done) return;
    if (left <= 0) {
      answer(null);
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, answered, done, level.time]);

  const finish = () => {
    const correct = round.filter(isRight).length;
    const pct = Math.round((correct / round.length) * 100);
    const grade = gradeFromScore(pct);
    const best = load<Best>(BEST_KEY, {});
    const key = `${subject}:${level.id}`;
    const record = !best[key] || pct > best[key].pct;
    if (record) save(BEST_KEY, { ...best, [key]: { grade, pct } });
    setSaved({ grade, pct, record });
    setDone(true);
  };

  const next = () => {
    if (i === round.length - 1 || outOfLives) return finish();
    setI(i + 1);
    setShowHint(false);
    setLeft(level.time);
  };

  const restart = () => {
    setRound(makeRound(subject, level));
    setI(0);
    setShowHint(false);
    setLeft(level.time);
    setDone(false);
    setSaved(null);
  };

  const subj = SUBJECTS.find((s) => s.id === subject)!;

  if (done && saved) {
    const correct = round.filter(isRight).length;
    const missed = round.filter((a) => !isRight(a));
    return (
      <div className="fag-result card">
        <div className="fag-result-top">
          <div className={`fag-grade g${saved.grade}`}>{saved.grade}</div>
          <div>
            <div className="small muted">
              {subj.name} · {level.icon} {level.name}
            </div>
            <h2>
              {correct} av {round.length} riktige ({saved.pct} %)
            </h2>
            <div className="small">
              {saved.grade >= 5 ? 'Veldig bra jobbet!' : saved.grade >= 3 ? 'Godkjent – øv litt til, så blir det enda bedre.' : 'Ikke bestått denne gangen. Les gjennom timene og prøv igjen.'}
              {saved.record && saved.pct > 0 && ' Ny rekord på dette nivået!'}
              {outOfLives && ' Du brukte opp alle livene, så resten av spørsmålene teller som feil.'}
            </div>
          </div>
        </div>
        {missed.length > 0 && (
          <div className="fag-review">
            <h3>Gå gjennom det du bommet på</h3>
            {missed.map((a, k) => (
              <div key={k} className="fag-review-item">
                <b>{a.q.q}</b>
                <div className="small">
                  {a.chosen === null ? (a.timedOut ? '⏱ Tiden gikk ut.' : 'Ikke besvart.') : <>Ditt svar: <span className="fag-wrong">{a.chosen}</span></>}
                </div>
                <div className="small">
                  Riktig svar: <span className="fag-right">{a.q.options[0]}</span>
                </div>
                <div className="small muted">{a.q.explanation}</div>
              </div>
            ))}
          </div>
        )}
        <div className="row">
          <button className="btn" onClick={onExit}>
            <ArrowLeft size={15} /> Velg nivå
          </button>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={restart}>
            <RotateCcw size={15} /> Ny runde på {level.name.toLowerCase()}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card learn-quiz fag-quiz">
      <div className="fag-quiz-top">
        <span className="badge badge-blue">
          {level.icon} {level.name}
        </span>
        <span className="small muted">
          Spørsmål {i + 1} av {round.length}
        </span>
        <span className="spacer" />
        {level.lives > 0 && (
          <span className="fag-lives" title="Liv">
            {Array.from({ length: level.lives }, (_, k) => (
              <Heart key={k} size={16} className={k < livesLeft ? 'on' : ''} />
            ))}
          </span>
        )}
        {level.time > 0 && (
          <span className={`fag-timer ${!answered && left <= 5 ? 'low' : ''}`}>
            <Clock size={14} /> {answered ? '–' : `${left} s`}
          </span>
        )}
      </div>
      <div className="fag-bar">
        <div style={{ width: `${(i / round.length) * 100}%` }} />
      </div>
      {level.time > 0 && !answered && (
        <div className="fag-timebar">
          <div style={{ width: `${(left / level.time) * 100}%` }} />
        </div>
      )}
      <div className="learn-question">{cur.q.q}</div>
      <div className="learn-options">
        {cur.shown.map((o) => {
          let cls = 'learn-option';
          if (answered && o === cur.q.options[0]) cls += ' correct';
          else if (answered && o === cur.chosen) cls += ' wrong';
          return (
            <button key={o} className={cls} onClick={() => answer(o)} disabled={answered && o !== cur.chosen && o !== cur.q.options[0]}>
              {o}
            </button>
          );
        })}
      </div>
      {showHint && !answered && (
        <div className="notice notice-info learn-hint">
          <Lightbulb size={18} color="var(--warn)" />
          <div>{cur.q.hint}</div>
        </div>
      )}
      {answered && (
        <div className={`notice ${isRight(cur) ? 'notice-ok' : 'notice-danger'}`}>
          {isRight(cur) ? <CheckCircle2 size={18} color="var(--ok)" /> : <XCircle size={18} color="var(--danger)" />}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{isRight(cur) ? 'Riktig!' : cur.timedOut ? 'Tiden gikk ut.' : 'Ikke riktig.'}</div>
            {cur.q.explanation}
          </div>
        </div>
      )}
      <div className="row">
        <button className="btn btn-ghost" onClick={onExit}>
          <ArrowLeft size={15} /> Avslutt
        </button>
        {level.hint && !answered && (
          <button className="btn" onClick={() => setShowHint((h) => !h)}>
            <Lightbulb size={16} /> {showHint ? 'Skjul hint' : 'Vis hint'}
          </button>
        )}
        <span className="spacer" />
        {answered && (
          <button className="btn btn-primary" onClick={next} autoFocus>
            {i === round.length - 1 || outOfLives ? 'Se resultatet' : 'Neste spørsmål'} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Faget: timer og quiz ------------------------------------------------------
function SubjectView({ subject, onBack }: { subject: Subject; onBack: () => void }) {
  const subj = SUBJECTS.find((s) => s.id === subject)!;
  const [tab, setTab] = useState<'laer' | 'quiz'>('laer');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [level, setLevel] = useState<LevelDef | null>(null);
  const [read, setRead] = useState<string[]>(() => load<string[]>(READ_KEY, []));
  const best = load<Best>(BEST_KEY, {});

  const lessons = useMemo(
    () => Object.keys(LESSONS).filter((id) => SUBJECT_OF[id] === subject),
    [subject],
  );

  if (lessonId) {
    return (
      <div className="fag-lesson">
        <button className="btn btn-ghost btn-sm" onClick={() => setLessonId(null)}>
          <ArrowLeft size={14} /> Tilbake til timene
        </button>
        <LessonView
          lesson={LESSONS[lessonId]}
          doneLabel="Ferdig med timen"
          onDone={() => {
            const next = read.includes(lessonId) ? read : [...read, lessonId];
            setRead(next);
            save(READ_KEY, next);
            setLessonId(null);
          }}
        />
      </div>
    );
  }

  if (level) return <Quiz subject={subject} level={level} onExit={() => setLevel(null)} />;

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Alle fag
        </button>
        <h2 style={{ margin: 0 }}>
          {ABOUT[subject].icon} {subj.name}
        </h2>
      </div>
      <div className="fag-tabs">
        <button className={tab === 'laer' ? 'on' : ''} onClick={() => setTab('laer')}>
          <BookOpen size={15} /> Lær
        </button>
        <button className={tab === 'quiz' ? 'on' : ''} onClick={() => setTab('quiz')}>
          <School size={15} /> Quiz
        </button>
      </div>

      {tab === 'laer' ? (
        <>
          <p className="muted">Læreren går gjennom stoffet lysbilde for lysbilde. Til slutt får du et kontrollspørsmål. Les timene før du tar quizen.</p>
          <div className="fag-lessons">
            {lessons.map((id) => {
              const l = LESSONS[id];
              return (
                <button key={id} className="fag-lesson-card" onClick={() => setLessonId(id)}>
                  <span className="badge">{id.startsWith('k1') ? 'Vg1' : 'Vg2'}</span>
                  <b>{l.title}</b>
                  <span className="small muted">{l.slides.length} lysbilder</span>
                  {read.includes(id) && (
                    <span className="fag-read">
                      <CheckCircle2 size={14} /> Lest
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p className="muted">Velg vanskelighetsgrad. Du får karakter fra 1 til 6, og den beste karakteren din på hvert nivå blir lagret.</p>
          <div className="fag-levels">
            {LEVELS.map((l) => {
              const b = best[`${subject}:${l.id}`];
              return (
                <button key={l.id} className={`fag-level lv-${l.id}`} onClick={() => setLevel(l)}>
                  <div className="fag-level-head">
                    <span className="fag-level-icon">{l.icon}</span>
                    <b>{l.name}</b>
                    <span className="spacer" />
                    {b && <span className={`fag-grade small g${b.grade}`} title={`Beste: ${b.pct} %`}>{b.grade}</span>}
                  </div>
                  <span className="small muted">{levelText(l)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function FagPage() {
  const [subject, setSubject] = useState<Subject | null>(null);
  const best = load<Best>(BEST_KEY, {});

  return (
    <div className="page fag-page">
      <PageHeader
        icon={<School size={26} color="var(--accent-2)" />}
        title="Fag og quiz"
        description="Velg et fag, les timene og test deg selv med quiz på fire vanskelighetsgrader. Fremgangen lagres i nettleseren."
      />
      {subject ? (
        <SubjectView subject={subject} onBack={() => setSubject(null)} />
      ) : (
        <div className="fag-subjects">
          {SUBJECTS.map((s) => {
            const lessons = Object.keys(LESSONS).filter((id) => SUBJECT_OF[id] === s.id).length;
            return (
              <button key={s.id} className="fag-subject card" onClick={() => setSubject(s.id)}>
                <div className="fag-subject-icon">{ABOUT[s.id].icon}</div>
                <h3>{s.name}</h3>
                <p className="small muted">{ABOUT[s.id].text}</p>
                <div className="small">{lessons} timer · quiz på 4 nivåer</div>
                <div className="fag-best-row">
                  {LEVELS.map((l) => {
                    const b = best[`${s.id}:${l.id}`];
                    return (
                      <span key={l.id} className="fag-best" title={`${l.name}${b ? `: beste karakter ${b.grade} (${b.pct} %)` : ': ikke tatt ennå'}`}>
                        {l.icon} {b ? b.grade : '–'}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="small muted" style={{ marginTop: 20 }}>
        Karakterene her er bare for øving. De sier ingenting om den virkelige vurderingen på skolen.
      </p>
      <SafetyNotice variant="general" />
    </div>
  );
}
