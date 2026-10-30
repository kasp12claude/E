import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, BookOpen, Briefcase, Check, Coins, Lock, LogOut, Moon, Play, Save, ShoppingCart, Star, Trash2, Trophy, Users, Lightbulb } from 'lucide-react';
import type { Mission, Scene, StoryState } from './types';
import { STAGES } from './types';
import {
  applyEffects,
  chapterIndex,
  chapterProgress,
  check,
  currentChapter,
  deleteSlot,
  hasNews,
  nextHint,
  lastSlot,
  levelInfo,
  locationsFor,
  missionsAt,
  readSlot,
  scenesAt,
  sceneById,
  missionById,
  SLOTS,
  stageInfo,
  useStory,
  completeScene,
  subjectGrades,
  isGraded,
} from './engine';
import { SUBJECTS } from './content/school';
import type { YearResult } from './types';
import { CONTENT } from './content';
import { CHARACTERS, SHOP, char } from './world';
import { DialogueView } from './DialogueView';
import { MissionView } from './MissionView';
import { EffectChips } from './EffectChips';
import { Modal, Progress } from '../../components/ui';
import { formatDateTime } from '../../utils/id';
import './story.css';

// 3D-verdenen lastes bare når den brukes (three.js er stort)
const Story3DView = lazy(() => import('./Story3DView'));
const VIEW_KEY = 'elektrostudio-story-view';

const DISCLAIMER =
  'Story Mode er et læringsspill. Nivåer, titler og «fagprøven» i spillet betyr ikke at du har bestått utdanning, fått fagbrev eller er kvalifisert til elektrisk arbeid i virkeligheten. Farlige arbeidsoperasjoner skjer bare i virtuelle simuleringer.';

const MISSION_TYPE: Record<string, string> = {
  scenario: 'Situasjon',
  match: 'Koble sammen',
  quiz: 'Prøve',
  calc: 'Beregning',
  editor: 'Tegning',
  faultfind: 'Feilsøking',
  materials: 'Materialliste',
  risk: 'Risikovurdering',
  report: 'Dokumentasjon',
  game3d: '3D-jobb',
};

export default function StoryPage() {
  const s = useStory((x) => x.s);
  const load = useStory((x) => x.load);
  const [params, setParams] = useSearchParams();

  // Tilbake fra tegneverktøyet eller 3D-spillet: fortsett siste lagring automatisk
  useEffect(() => {
    if (!params.get('fortsett')) return;
    const n = lastSlot();
    if (n && (!s || s.slot !== n)) load(n);
    else if (n && s) load(n); // last inn på nytt i tilfelle noe er endret
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return s ? (
    <StoryGame s={s} />
  ) : (
    <div className="story-scroll">
      <TitleScreen />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tittelskjerm med lagringsplasser
// ---------------------------------------------------------------------------
function TitleScreen() {
  const load = useStory((x) => x.load);
  const start = useStory((x) => x.start);
  const [, force] = useState(0);
  const [newIn, setNewIn] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const last = lastSlot();

  return (
    <div className="story-title">
      <div className="story-hero">
        <div className="story-logo">
          <Lightbulb size={40} />
        </div>
        <div>
          <div className="small muted">ElektroStudio · Story Mode</div>
          <h1>Elektrokarrieren min</h1>
          <p>
            Start som elev på elektro Vg1, lær av lærerne dine, ta ekstrajobber, kjøp ditt eget verktøy, få læreplass – og jobb deg opp til fagarbeider i spillet. Valgene dine
            påvirker omdømme, vennskap og hvilke dører som åpner seg.
          </p>
          {last && (
            <button className="btn btn-primary btn-lg" onClick={() => load(last)}>
              <Play size={18} /> Fortsett ({readSlot(last)?.playerName})
            </button>
          )}
        </div>
      </div>

      <div className="slots">
        {SLOTS.map((n) => {
          const st = readSlot(n);
          return (
            <div key={n} className={`slot card ${st ? '' : 'slot-free'}`}>
              <div className="slot-n">Lagringsplass {n}</div>
              {st ? (
                <>
                  <div className="slot-name">{st.playerName}</div>
                  <div className="small">
                    {stageInfo(st.stage).name} · Nivå {levelInfo(st.xp).level} · {st.xp} XP
                  </div>
                  <div className="small muted">
                    Kapittel {chapterIndex(st.chapter) + 1}: {currentChapter(st)?.title} · Dag {st.day}
                  </div>
                  <div className="small muted">Sist spilt {formatDateTime(st.updatedAt)}</div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => load(n)}>
                      <Play size={14} /> Spill
                    </button>
                    {confirmDel === n ? (
                      <>
                        <span className="small">Slette for godt?</span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            deleteSlot(n);
                            setConfirmDel(null);
                            force((x) => x + 1);
                          }}
                        >
                          Ja, slett
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>
                          Avbryt
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(n)} aria-label="Slett lagring">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </>
              ) : newIn === n ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    start(n, name);
                  }}
                >
                  <label className="field">
                    <span className="label">Hva heter du?</span>
                    <input className="input" autoFocus maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Navnet ditt" />
                  </label>
                  <div className="row">
                    <button className="btn btn-primary btn-sm" type="submit" disabled={!name.trim()}>
                      Start karrieren
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setNewIn(null)}>
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="slot-name muted">Ledig</div>
                  <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setNewIn(n)}>
                    Ny karriere
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="story-path">
        {STAGES.map((st, i) => (
          <div key={st.id} className="path-step">
            <span className="path-dot">{i + 1}</span>
            {st.name}
          </div>
        ))}
      </div>
      <div className="notice notice-info small">{DISCLAIMER}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selve spillet
// ---------------------------------------------------------------------------
function StoryGame({ s }: { s: StoryState }) {
  const update = useStory((x) => x.update);
  const quit = useStory((x) => x.quit);
  const locs = locationsFor(s);
  const here = locs.find((l) => l.id === s.location) ?? locs[0];
  const lv = levelInfo(s.xp);
  const [view, setViewState] = useState<'3d' | 'kart'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'kart' ? 'kart' : '3d';
    } catch {
      return '3d';
    }
  });
  const setView = (v: '3d' | 'kart') => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignorer */
    }
  };

  // Vis nytt kapittel når det starter
  const prevChapter = useRef(s.chapter);
  const [chapterIntro, setChapterIntro] = useState<string | null>(s.journal.length <= 1 ? s.chapter : null);
  useEffect(() => {
    if (prevChapter.current !== s.chapter) setChapterIntro(s.chapter);
    prevChapter.current = s.chapter;
  }, [s.chapter]);
  const introCh = chapterIntro ? CONTENT.chapters.find((c) => c.id === chapterIntro) : undefined;

  // Vis karakterkortet når et skoleår er avsluttet (bestått eller strøket)
  const prevYears = useRef(s.yearResults?.length ?? 0);
  const [yearCard, setYearCard] = useState<YearResult | null>(null);
  useEffect(() => {
    const n = s.yearResults?.length ?? 0;
    if (n > prevYears.current) setYearCard(s.yearResults![n - 1]);
    prevYears.current = n;
  }, [s.yearResults]);

  const a = s.active;
  const activeScene = a?.kind === 'scene' ? sceneById(a.id) : undefined;
  const activeMission = a?.kind === 'mission' ? missionById(a.id) : undefined;
  const busy = !!activeScene || (a?.kind === 'mission' && a.phase === 'work');

  const go = (id: string) => {
    if (busy) return;
    update((x) => ({ ...x, location: id, active: undefined }));
  };

  let center: React.ReactNode;
  if (activeScene) {
    center = (
      <DialogueView
        key={activeScene.id}
        title={activeScene.title}
        nodes={activeScene.nodes}
        start={activeScene.start}
        state={s}
        playerName={s.playerName}
        onEffects={(e) => update((x) => applyEffects(x, e))}
        onEnd={() => update((x) => completeScene(x, activeScene))}
      />
    );
  } else if (activeMission) {
    center = <MissionView key={activeMission.id} mission={activeMission} state={s} />;
  } else if (here) {
    center = <LocationView s={s} locId={here.id} />;
  }

  return (
    <div className="story">
      <div className="story-bar">
        <div className="sb-who">
          <div className="sb-avatar">🙂</div>
          <div>
            <div className="sb-name">{s.playerName}</div>
            <div className="small muted">{stageInfo(s.stage).name}</div>
          </div>
        </div>
        <div className="sb-level" title={`${lv.into} av ${lv.need} XP til neste nivå`}>
          <div className="small">
            <b>Nivå {lv.level}</b> · {s.xp} XP
          </div>
          <Progress value={lv.into / lv.need} />
        </div>
        <div className="sb-stat" title="Penger (i spillet)">
          <Coins size={16} /> {s.money.toLocaleString('nb-NO')} kr
        </div>
        <div className="sb-stat" title="Omdømme (0–100)">
          <Star size={16} /> {s.reputation}
        </div>
        <div className="sb-stat" title="Dag">
          <Moon size={16} /> Dag {s.day}
        </div>
        <div className="sb-stat" title="Alder i spillet">
          {s.age ?? 16} år
          {s.flags.eldre_enn_klassen && (s.stage === 'vg1' || s.stage === 'vg2') ? <span className="badge older">ett år eldre enn klassen</span> : null}
        </div>
        <span className="spacer" />
        <span className="small muted sb-saved">
          <Save size={13} /> Lagres automatisk
        </span>
        <div className="view-toggle" role="group" aria-label="Visning">
          <button className={`btn btn-sm ${view === '3d' ? 'btn-primary' : ''}`} onClick={() => setView('3d')}>
            3D
          </button>
          <button className={`btn btn-sm ${view === 'kart' ? 'btn-primary' : ''}`} onClick={() => setView('kart')}>
            Kart
          </button>
        </div>
        <button className="btn btn-sm" onClick={quit}>
          <LogOut size={14} /> Til hovedmenyen
        </button>
      </div>

      {view === '3d' ? (
        <div className="story-main story-main-3d">
          <Suspense fallback={<div className="page muted">Laster 3D-verdenen …</div>}>
            <Story3DView s={s} activeContent={activeScene || activeMission ? center : null} renderPlace={(loc) => <LocationView s={s} locId={loc} />} />
          </Suspense>
          <aside className="story-side">
            <ChapterPanel s={s} />
          </aside>
        </div>
      ) : (
      <div className="story-main">
        <nav className="story-map" aria-label="Steder">
          <div className="map-h">Kart</div>
          {locs.map((l) => (
            <button key={l.id} className={`map-loc ${l.id === here?.id ? 'on' : ''}`} onClick={() => go(l.id)} disabled={busy && l.id !== here?.id} title={l.description}>
              <span className="map-icon">{l.icon}</span>
              <span className="map-name">{l.name}</span>
              {hasNews(s, l.id) && <span className="map-news">!</span>}
            </button>
          ))}
          {busy && <div className="small muted" style={{ padding: 8 }}>Fullfør eller avbryt det du holder på med før du drar et annet sted.</div>}
        </nav>

        <main className="story-center">{center}</main>

        <aside className="story-side">
          <ChapterPanel s={s} />
          <div className="side-box">
            <div className="side-h">
              <BookOpen size={15} /> Dagbok
            </div>
            <div className="journal">
              {[...s.journal]
                .reverse()
                .slice(0, 10)
                .map((j, i) => (
                  <div key={i} className="journal-row">
                    <span className="journal-day">Dag {j.day}</span> {j.text}
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
      )}

      {yearCard && (
        <Modal
          title="Karakterkort"
          onClose={() => setYearCard(null)}
          footer={
            <button className="btn btn-primary" onClick={() => setYearCard(null)} autoFocus>
              OK
            </button>
          }
        >
          <GradeCard r={yearCard} />
          <p className="small muted">{yearCard.passed ? 'Du går videre.' : 'Med karakter 1 i et fag må skoleåret tas på nytt. Du blir ett år eldre enn de andre i klassen.'}</p>
        </Modal>
      )}
      {!yearCard && introCh && (
        <Modal
          title={`Kapittel ${introCh.number}`}
          onClose={() => setChapterIntro(null)}
          footer={
            <button className="btn btn-primary" onClick={() => setChapterIntro(null)} autoFocus>
              Sett i gang
            </button>
          }
        >
          <div className="chapter-intro">
            <div className="small muted">{stageInfo(introCh.stage).name}</div>
            <h2>{introCh.title}</h2>
            <p>{introCh.description}</p>
            <div className="label">For å fullføre kapitlet:</div>
            <ul>
              {chapterProgress(s, introCh).reqs.map((r, i) => (
                <li key={i}>{r.text}</li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Karakterkort for ett skoleår */
function GradeCard({ r }: { r: YearResult }) {
  return (
    <div className={`grade-card ${r.passed ? 'ok' : 'fail'}`}>
      <div className="gc-head">
        <b>{stageInfo(r.stage).name}</b>
        <span className="small muted">
          {r.attempt > 1 ? `${r.attempt}. forsøk · ` : ''}Dag {r.day}
        </span>
        <span className={`badge ${r.passed ? 'badge-green' : 'badge-red'}`}>{r.passed ? 'Bestått' : 'Ikke bestått'}</span>
      </div>
      {SUBJECTS.map((sub) => (
        <div key={sub.id} className="gc-row">
          <span>{sub.name}</span>
          <span className={`grade-badge small g${r.grades[sub.id] ?? 0}`}>{r.grades[sub.id] ?? '–'}</span>
        </div>
      ))}
    </div>
  );
}

/** Karakterene så langt i skoleåret */
function GradePanel({ s, chapterId }: { s: StoryState; chapterId: string }) {
  return (
    <div className="grades-now">
      {subjectGrades(s, chapterId).map((g) => (
        <div key={g.subject.id} className="gc-row" title={g.graded.map((m) => `${m.title}: ${s.missions[m.id].grade}`).join('\n')}>
          <span>
            {g.subject.short} <span className="small muted">({g.graded.length}/{g.missions.length})</span>
          </span>
          <span className={`grade-badge small g${g.grade ?? 0}`}>{g.avg === null ? '–' : g.avg.toFixed(1).replace('.', ',')}</span>
        </div>
      ))}
    </div>
  );
}

function ChapterPanel({ s }: { s: StoryState }) {
  const ch = currentChapter(s);
  if (!ch) return null;
  const p = chapterProgress(s, ch);
  const done = !!s.flags.karriere_fullfort;
  return (
    <div className="side-box">
      <div className="side-h">
        <Trophy size={15} /> Kapittel {ch.number} av {CONTENT.chapters.length}
      </div>
      <div className="ch-title">
        {ch.title}
        {(s.retakes?.[ch.id] ?? 0) > 0 && <span className="small muted"> · {(s.retakes?.[ch.id] ?? 0) + 1}. forsøk</span>}
      </div>
      {isGraded(ch.id) && !done && (
        <>
          <div className="small muted">Karakterer så langt (snitt per fag):</div>
          <GradePanel s={s} chapterId={ch.id} />
        </>
      )}
      {done ? (
        <div className="small" style={{ color: 'var(--ok)' }}>
          Hele karrieren er fullført!
        </div>
      ) : (
        <>
          <div className="next-hint">
            <b>Neste steg:</b> {nextHint(s).text}
          </div>
          <ul className="reqs">
            {p.reqs.map((r, i) => (
              <li key={i} className={r.ok ? 'ok' : ''}>
                {r.ok ? <Check size={13} /> : <span className="req-dot" />} {r.text}
              </li>
            ))}
          </ul>
          <div className="small muted" style={{ marginTop: 4 }}>
            {p.ready ? `Alt er levert! Se etter «!» på kartet for å få resultatet.` : 'Hovedoppdrag:'}
          </div>
          {!p.ready && (
            <ul className="core-list">
              {p.core.map((m) => (
                <li key={m.id} className={s.missions[m.id]?.completedAt ? 'ok' : ''}>
                  {s.missions[m.id]?.completedAt ? <Check size={12} /> : <span className="req-dot" />} {m.title}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Et sted på kartet
// ---------------------------------------------------------------------------
function LocationView({ s, locId }: { s: StoryState; locId: string }) {
  const setActive = useStory((x) => x.setActive);
  const l = locationsFor(s).find((x) => x.id === locId)!;
  const scenes = scenesAt(s, locId);
  const missions = missionsAt(s, locId);
  const open = missions.filter((m) => m.status !== 'fullført');
  const done = missions.filter((m) => m.status === 'fullført');

  const startScene = (sc: Scene) => setActive({ kind: 'scene', id: sc.id, node: sc.start });
  const startMission = (m: Mission) => setActive({ kind: 'mission', id: m.id, phase: 'brief', startedAt: Date.now(), docId: s.missions[m.id]?.docId });

  return (
    <div className="loc">
      <div className="loc-head">
        <span className="loc-icon">{l.icon}</span>
        <div>
          <h2>{l.name}</h2>
          <div className="muted">{l.description}</div>
        </div>
      </div>

      {scenes.length > 0 && (
        <section>
          <div className="sec-h">
            <Users size={15} /> Hendelser
          </div>
          <div className="cards">
            {scenes.map((sc) => {
              const first = sc.nodes.find((n) => n.id === sc.start);
              const who = first?.speaker ? char(first.speaker) : undefined;
              return (
                <button key={sc.id} className={`scene-card ${sc.main ? 'main' : ''}`} onClick={() => startScene(sc)}>
                  {who && who.id !== 'forteller' ? (
                    <span className="dlg-avatar" style={{ background: who.color }}>
                      {who.avatar}
                    </span>
                  ) : (
                    <span className="dlg-avatar narrator">💬</span>
                  )}
                  <span>
                    <b>{sc.title}</b>
                    <span className="small muted">{sc.main ? 'Historie' : 'Samtale'}{who && who.id !== 'forteller' ? ` · ${who.name}` : ''}</span>
                  </span>
                  {sc.main && <span className="map-news">!</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {open.length > 0 && (
        <section>
          <div className="sec-h">
            <Briefcase size={15} /> Oppdrag
          </div>
          <div className="cards">
            {open.map(({ mission: m, status, lock }) => {
              const giver = char(m.giver);
              const locked = status === 'låst';
              return (
                <div key={m.id} className={`mission-card ${locked ? 'locked' : ''} ${m.core ? 'core' : ''}`}>
                  <div className="mc-top">
                    {giver && (
                      <span className="dlg-avatar" style={{ background: giver.color }} title={giver.name}>
                        {giver.avatar}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="mc-title">{m.title}</div>
                      <div className="small muted">
                        {MISSION_TYPE[m.workspace.type]}
                        {m.core ? ' · Hovedoppdrag' : m.sideJob ? ' · Ekstrajobb' : ' · Valgfritt'}
                        {s.missions[m.id]?.attempts ? ` · ${s.missions[m.id].attempts} forsøk` : ''}
                      </div>
                    </div>
                  </div>
                  <p className="small">{m.summary}</p>
                  <EffectChips e={m.reward} />
                  {locked ? (
                    <div className="small lock">
                      <Lock size={13} /> {lock}
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => startMission(m)}>
                      <Play size={14} /> {m.repeatable && s.missions[m.id]?.attempts ? 'Ta jobben igjen' : 'Ta oppdraget'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {locId === 'hjem' && <CareerView s={s} />}
      {locId === 'butikk' && <ShopView s={s} />}

      {scenes.length === 0 && open.length === 0 && locId !== 'hjem' && locId !== 'butikk' && (
        <div className="empty">Ingenting å gjøre her akkurat nå. Se etter «!» på kartet.</div>
      )}

      {done.length > 0 && (
        <details className="done-list">
          <summary className="small muted">Leverte oppdrag her ({done.length})</summary>
          <ul>
            {done.map(({ mission: m }) => (
              <li key={m.id} className="small">
                {s.missions[m.id]?.passed ? <Check size={12} /> : <span className="neg">✗</span>} {m.title} –{' '}
                {s.missions[m.id]?.grade !== undefined ? <b>karakter {s.missions[m.id].grade}</b> : s.missions[m.id]?.passed ? 'godkjent' : <span className="neg">ikke godkjent</span>} ({s.missions[m.id]?.best ?? 0} %)
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hybelen: karriereoversikt
// ---------------------------------------------------------------------------
function CareerView({ s }: { s: StoryState }) {
  const update = useStory((x) => x.update);
  const lv = levelInfo(s.xp);
  const stageIdx = STAGES.findIndex((x) => x.id === s.stage);
  const completed = Object.values(s.missions).filter((m) => m.completedAt).length;
  const known = CHARACTERS.filter((c) => s.relations[c.id] !== undefined);
  const firma = typeof s.flags.firma === 'string' ? (s.flags.firma === 'lynkobling' ? 'Lynkobling AS' : 'Nordlys Elektro') : null;

  return (
    <section className="career">
      {s.flags.karriere_fullfort && (
        <div className="the-end">
          <Award size={34} />
          <div>
            <h3>Gratulerer, {s.playerName}!</h3>
            <p>
              Du har fullført Elektrokarrieren i spillet – fra første skoledag til fagarbeider. Du kan fortsette å ta ekstrajobber og forbedre resultatene dine. Husk: i
              virkeligheten krever fagbrev godkjent opplæring og bestått fagprøve.
            </p>
          </div>
        </div>
      )}
      <div className="sec-h">
        <Award size={15} /> Karrieren din
      </div>
      <div className="stage-track">
        {STAGES.map((st, i) => (
          <div key={st.id} className={`stage ${i < stageIdx ? 'past' : i === stageIdx ? 'now' : ''}`}>
            <span className="stage-dot">{i < stageIdx ? <Check size={13} /> : i + 1}</span>
            <span>{st.name}</span>
          </div>
        ))}
      </div>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-v">{lv.level}</div>
          <div className="small muted">Nivå</div>
        </div>
        <div className="stat">
          <div className="stat-v">{s.xp}</div>
          <div className="small muted">Erfaringspoeng</div>
        </div>
        <div className="stat">
          <div className="stat-v">{completed}</div>
          <div className="small muted">Oppdrag levert</div>
        </div>
        <div className="stat">
          <div className="stat-v">{s.reputation}</div>
          <div className="small muted">Omdømme</div>
        </div>
        {firma && (
          <div className="stat">
            <div className="stat-v" style={{ fontSize: 16 }}>
              {firma}
            </div>
            <div className="small muted">Arbeidsgiver</div>
          </div>
        )}
      </div>

      {(s.yearResults?.length ?? 0) > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="label">Karakterkort</div>
          <div className="grade-cards">
            {s.yearResults!.map((r, i) => (
              <GradeCard key={i} r={r} />
            ))}
          </div>
        </div>
      )}
      <div className="two-col">
        <div>
          <div className="label">Folk du kjenner</div>
          {known.length === 0 && <div className="small muted">Ingen ennå – snakk med folk!</div>}
          {known.map((c) => {
            const v = s.relations[c.id];
            return (
              <div key={c.id} className="rel-row">
                <span className="dlg-avatar small" style={{ background: c.color }}>
                  {c.avatar}
                </span>
                <span style={{ flex: 1 }}>
                  {c.name} <span className="small muted">· {c.role}</span>
                </span>
                <span className={`small ${v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted'}`}>{v >= 3 ? 'God venn' : v > 0 ? 'Liker deg' : v < 0 ? 'Skeptisk' : 'Nøytral'}</span>
              </div>
            );
          })}
        </div>
        <div>
          <div className="label">Utstyret ditt</div>
          {s.inventory.length === 0 && <div className="small muted">Ingenting ennå. Besøk verktøybutikken.</div>}
          <ul className="inv">
            {s.inventory.map((id) => (
              <li key={id}>{SHOP.find((x) => x.id === id)?.name ?? id}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => update((x) => applyEffects(x, { days: 1, journal: 'Hvilte og samlet krefter.' }))}>
          <Moon size={15} /> Avslutt dagen
        </button>
        <span className="small muted">Lærlinger får dagslønn når de fullfører arbeidsoppdrag. Ekstrajobber på grossisten gir penger hele tiden.</span>
      </div>
      <div className="notice notice-info small" style={{ marginTop: 12 }}>
        {DISCLAIMER}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Verktøybutikken
// ---------------------------------------------------------------------------
function ShopView({ s }: { s: StoryState }) {
  const update = useStory((x) => x.update);
  const items = SHOP.filter((i) => check(i.if, s));
  const neededBy = (id: string) =>
    CONTENT.missions.filter((m) => m.requiresItems?.includes(id) && !s.missions[m.id]?.completedAt && chapterIndex(m.chapter) >= chapterIndex(s.chapter)).map((m) => m.title);
  return (
    <section>
      <div className="sec-h">
        <ShoppingCart size={15} /> Varer
      </div>
      <div className="cards">
        {items.map((it) => {
          const owned = s.inventory.includes(it.id);
          const need = neededBy(it.id);
          return (
            <div key={it.id} className={`shop-card ${owned ? 'owned' : ''}`}>
              <div className="mc-title">{it.name}</div>
              <div className="small muted">{it.category}</div>
              <p className="small">{it.description}</p>
              {need.length > 0 && !owned && <div className="small" style={{ color: 'var(--warn)' }}>Trengs til: {need.join(', ')}</div>}
              <div className="row" style={{ marginTop: 'auto' }}>
                <b>{it.price.toLocaleString('nb-NO')} kr</b>
                <span className="spacer" />
                {owned ? (
                  <span className="badge badge-green">
                    <Check size={12} /> Eier
                  </span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={s.money < it.price}
                    title={s.money < it.price ? 'Du har ikke råd ennå – ta en ekstrajobb' : undefined}
                    onClick={() => update((x) => applyEffects(x, { money: -it.price, items: [it.id], journal: `Kjøpte ${it.name.toLowerCase()}.` }))}
                  >
                    Kjøp
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
