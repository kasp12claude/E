import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Flashlight, Gamepad2, Lock, LockOpen, Moon, Power, RotateCcw, ShieldAlert, Star, Sun, Trophy, X, Zap } from 'lucide-react';
import { Game, type MessageKind, type TimeOfDay } from './engine';
import type { LevelDef } from './levels';
import { DIFFICULTY_NAME, LEVELS } from './campaign';
import { taskLabel, template } from './wiring';
import { WiringPuzzle } from './WiringPuzzle';
import { TOOLS } from './tools';
import './game.css';

interface Progress {
  /** lastWin/lastStars brukes av Story Mode for å se om jobben er gjort */
  [levelId: string]: { stars: number; best: number; lastWin?: number; lastStars?: number };
}
const PROGRESS_KEY = 'elektrostudio-game-progress';
function readProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignorer */
  }
}

const TIME_KEY = 'elektrostudio-game-time';
function readTime(): TimeOfDay {
  try {
    return localStorage.getItem(TIME_KEY) === 'dag' ? 'dag' : 'natt';
  } catch {
    return 'natt';
  }
}

export default function GamePage() {
  // Story Mode åpner spillet med ?level=ID&story=1
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const story = params.get('story') === '1';
  const [level, setLevelState] = useState<LevelDef | null>(() => LEVELS.find((l) => l.id === params.get('level')) ?? null);
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [time, setTimeState] = useState<TimeOfDay>(readTime);
  const setTime = (t: TimeOfDay) => {
    setTimeState(t);
    try {
      localStorage.setItem(TIME_KEY, t);
    } catch {
      /* ignorer */
    }
  };
  const setLevel = (l: LevelDef | null) => {
    setLevelState(l);
    setRun((r) => r + 1);
  };
  if (!level) return <Menu progress={progress} onStart={setLevel} time={time} setTime={setTime} />;
  return (
    <Play
      key={run}
      level={level}
      timeOfDay={time}
      story={story}
      onExit={() => (story ? navigate('/story?fortsett=1') : setLevel(null))}
      onWin={(stars, score) => {
        const p = { ...readProgress() };
        const prev = p[level.id];
        p[level.id] = { stars: Math.max(prev?.stars ?? 0, stars), best: Math.max(prev?.best ?? -Infinity, score), lastWin: Date.now(), lastStars: stars };
        saveProgress(p);
        setProgress(p);
      }}
      onNext={() => {
        const i = LEVELS.findIndex((l) => l.id === level.id);
        setLevel(LEVELS[i + 1] ?? null);
      }}
    />
  );
}

function Menu({ progress, onStart, time, setTime }: { progress: Progress; onStart: (l: LevelDef) => void; time: TimeOfDay; setTime: (t: TimeOfDay) => void }) {
  return (
    <div className="game-menu">
      <div className="game-menu-inner">
        <div className="game-title">
          <div className="game-logo">
            <Zap size={34} color="#fff" fill="#fff" />
          </div>
          <div>
            <h1>Elektrikerspillet</h1>
            <p className="muted">Du er elektriker på oppdrag. Gå inn i kundenes hus, finn feilene og få lyset til å virke – og jobb trygt hele veien.</p>
          </div>
        </div>
        <div className="time-choice" role="radiogroup" aria-label="Tid på døgnet">
          <span className="small muted">Tid på døgnet:</span>
          <button role="radio" aria-checked={time === 'dag'} className={`time-btn ${time === 'dag' ? 'active day' : ''}`} onClick={() => setTime('dag')}>
            <Sun size={18} /> Dag
            <span className="small">Sol og blå himmel</span>
          </button>
          <button role="radio" aria-checked={time === 'natt'} className={`time-btn ${time === 'natt' ? 'active night' : ''}`} onClick={() => setTime('natt')}>
            <Moon size={18} /> Natt
            <span className="small">Mørkt – ta med lommelykt</span>
          </button>
        </div>
        <div className="row" style={{ marginBottom: 6 }}>
          <span className="badge badge-yellow">
            <Star size={13} fill="#facc15" color="#facc15" /> {LEVELS.reduce((s, l) => s + (progress[l.id]?.stars ?? 0), 0)} / {LEVELS.length * 3} stjerner
          </span>
          <span className="small muted">
            {LEVELS.filter((l) => progress[l.id]).length} av {LEVELS.length} oppdrag fullført
          </span>
        </div>
        {([1, 2, 3] as const).map((d) => (
          <section key={d} style={{ marginTop: 14 }}>
            <h2 style={{ marginBottom: 8 }}>
              {DIFFICULTY_NAME[d]} <span className="small muted">{'●'.repeat(d)}{'○'.repeat(3 - d)}</span>
            </h2>
        <div className="level-grid">
          {LEVELS.map((l, i) => {
            if (l.difficulty !== d) return null;
            const pr = progress[l.id];
            return (
              <button key={l.id} className="level-card" onClick={() => onStart(l)}>
                <div className="row">
                  <span className="badge badge-blue">Oppdrag {i + 1}</span>
                  <span className="spacer" />
                  {[1, 2, 3].map((s) => (
                    <Star key={s} size={16} color="#facc15" fill={pr && pr.stars >= s ? '#facc15' : 'none'} />
                  ))}
                </div>
                <h3>{l.name}</h3>
                <div className="small muted">{l.customer}</div>
                <p className="small">{l.story}</p>
                <div className="row small muted">
                  <span>{l.rooms.length} rom</span>·<span>{'●'.repeat(l.difficulty)}{'○'.repeat(3 - l.difficulty)} vanskelighet</span>
                  {pr && <span>· Beste: {pr.best} p</span>}
                </div>
              </button>
            );
          })}
        </div>
          </section>
        ))}
        <div className="grid grid-2" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="card-title">
              <Gamepad2 size={18} /> Kontroller
            </div>
            <table className="table small">
              <tbody>
                <tr><td><kbd>W A S D</kbd> / <kbd>↑ ↓</kbd></td><td>Gå fram, bak og til siden</td></tr>
                <tr><td>Mus</td><td>Se deg rundt (eller hold inne museknappen og dra)</td></tr>
                <tr><td><kbd>← →</kbd> / <kbd>Q R</kbd></td><td>Snu deg</td></tr>
                <tr><td><kbd>Shift</kbd></td><td>Løp</td></tr>
                <tr><td><kbd>E</kbd></td><td>Bruk (bryter, sikringsskap, koblingsboks)</td></tr>
                <tr><td><kbd>1</kbd>–<kbd>7</kbd></td><td>Velg verktøy fra verktøybeltet</td></tr>
                <tr><td><kbd>M</kbd></td><td>Ta fram spenningstesteren og mål</td></tr>
                <tr><td><kbd>F</kbd></td><td>Lommelykt av/på</td></tr>
                <tr><td><kbd>Esc</kbd></td><td>Pause</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-title">
              <ShieldAlert size={18} color="var(--warn)" /> Slik jobber du trygt i spillet
            </div>
            <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.75 }}>
              <li>✋ Slå av riktig kurs i sikringsskapet (hånd, 1).</li>
              <li>🔒 Sikre mot innkobling med lås og skilt (2).</li>
              <li>📟 Mål at det er spenningsløst ved koblingsboksen (spenningstester, 3).</li>
              <li>🪛 Skru opp boksen (skrutrekker, 4), ✂️ avisoler lederne (5) og 🔗 skjøt dem med koblingsklemmer (6).</li>
              <li>Fjern låsen, slå på kursen og test: lys med bryteren (hånd), stikkontakter med 🔌 kontrolltester (7).</li>
            </ol>
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
              Dette er et forenklet spill. I virkeligheten skal arbeid på elektriske anlegg bare utføres av kvalifiserte fagfolk etter gjeldende regler og opplæring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Msg {
  id: number;
  text: string;
  kind: MessageKind;
}
let msgId = 1;

function Play({
  level,
  timeOfDay,
  onExit,
  onWin,
  onNext,
  story,
}: {
  level: LevelDef;
  timeOfDay: TimeOfDay;
  story?: boolean;
  onExit: () => void;
  onWin: (stars: number, score: number) => void;
  onNext: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [, setTick] = useState(0);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [locked, setLocked] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [boxRoom, setBoxRoom] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [hintRooms, setHintRooms] = useState<Set<string>>(new Set());
  const [meter, setMeter] = useState<{ text: string; ok: boolean; screen: string } | null>(null);
  const meterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState(Date.now());
  const wonReported = useRef(false);
  const touch = typeof window !== 'undefined' && 'ontouchstart' in window && !matchMedia('(pointer: fine)').matches;
  const [mode, setMode] = useState<'locked' | 'drag'>('locked');
  const [showPad, setShowPad] = useState(true);

  const push = useCallback((text: string, kind: MessageKind) => {
    const id = msgId++;
    setMsgs((m) => [...m.slice(-3), { id, text, kind }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), kind === 'danger' ? 7000 : 5000);
  }, []);

  useEffect(() => {
    const g = new Game(holder.current!, level, {
      onChange: () => setTick((t) => t + 1),
      onPrompt: setPrompt,
      onMessage: push,
      onOpenPanel: () => setPanelOpen(true),
      onOpenBox: (id) => setBoxRoom(id),
      onLockChange: setLocked,
      onMeasure: (text, ok, screen) => {
        setMeter({ text, ok, screen });
        if (meterTimer.current) clearTimeout(meterTimer.current);
        meterTimer.current = setTimeout(() => setMeter(null), 4500);
      },
      onControlMode: setMode,
    }, timeOfDay);
    gameRef.current = g;
    // Testkrok i utviklingsmodus (brukes ikke i produksjonsbygget)
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = g;
    return () => g.dispose();
  }, [level, push, timeOfDay]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const g = gameRef.current;
  // Verktøyvalg med tallene også når sikringsskapet eller en boks er åpen
  useEffect(() => {
    if (!panelOpen && !boxRoom) return;
    const onKey = (e: KeyboardEvent) => {
      const t = TOOLS.find((x) => x.key === e.key);
      if (t) gameRef.current?.setTool(t.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, boxRoom]);
  const st = g?.state;
  const stars = st ? (st.violations === 0 && st.hintsUsed === 0 ? 3 : st.violations === 0 ? 2 : 1) : 0;
  useEffect(() => {
    if (st?.won && !wonReported.current) {
      wonReported.current = true;
      onWin(stars, st.score);
    }
  });

  const elapsed = st ? Math.floor(((st.endTime ?? now) - st.startTime) / 1000) : 0;
  const time = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const modal = panelOpen || !!boxRoom || st?.won;
  const box = boxRoom && st ? st.rooms.find((r) => r.def.id === boxRoom) : null;

  return (
    <div className="game-root">
      <div ref={holder} className="game-holder" />

      {/* HUD */}
      {st && (
        <>
          <div className="hud-crosshair" />
          <div className="hud-mission">
            <div className="hud-title">{level.customer}</div>
            <div className="small muted" style={{ marginBottom: 6 }}>
              {st.currentRoom ? `Du er i: ${st.currentRoom}` : 'Du er utenfor huset'}
            </div>
            {st.rooms.map((r) => (
              <div key={r.def.id} className="hud-task">
                {r.complete ? <CheckCircle2 size={15} color="#22c55e" /> : <Circle size={15} color="#64748b" />}
                <span>
                  {taskLabel(r.spec)} i {r.def.name.toLowerCase()} <span className="muted">· {template(r.spec).name.toLowerCase()}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="hud-stats">
            <span>
              <Trophy size={14} /> {st.score} p
            </span>
            <span className={st.violations ? 'bad' : ''}>
              <ShieldAlert size={14} /> {st.violations} sikkerhetsbrudd
            </span>
            <span>⏱ {time}</span>
            <button className={`hud-btn ${st.flashlight ? 'on' : ''}`} onClick={() => g!.setFlashlight(!st.flashlight)} title="Lommelykt (F)">
              <Flashlight size={14} />
            </button>
          </div>
          {prompt && locked && !modal && <div className="hud-prompt">{prompt}</div>}
          {meter && (
            <div className={`hud-meter ${meter.ok ? 'ok' : 'bad'}`}>
              <div className="meter-screen">{meter.screen}</div>
              <div className="small">{meter.text}</div>
            </div>
          )}
          <div className="hud-msgs">
            {msgs.map((m) => (
              <div key={m.id} className={`hud-msg ${m.kind}`}>
                {m.text}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Knapper på skjermen for å gå og snu (berøring, og mus når pekeren ikke kan låses) */}
      {(touch || (mode === 'drag' && showPad)) && locked && !modal && g && (
        <div className="touch-pad">
          <div className="dpad">
            {(
              [
                ['⟲', 0, 0, 1, 'turn-left', 'Snu til venstre'],
                ['▲', 1, 0, 0, 'up', 'Gå fram'],
                ['⟳', 0, 0, -1, 'turn-right', 'Snu til høyre'],
                ['◀', 0, -1, 0, 'left', 'Gå til venstre'],
                ['▶', 0, 1, 0, 'right', 'Gå til høyre'],
                ['▼', -1, 0, 0, 'down', 'Gå bakover'],
              ] as const
            ).map(([label, f, r, turn, cls, title]) => {
              const start = (e: React.PointerEvent) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                } catch {
                  /* ikke støttet – knappen virker fortsatt */
                }
                g.touchMove = { f, r };
                g.touchTurn = turn;
              };
              const stop = () => {
                g.touchMove = { f: 0, r: 0 };
                g.touchTurn = 0;
              };
              return (
                <button key={cls} className={`dpad-btn ${cls}`} title={title} onPointerDown={start} onPointerUp={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="touch-actions">
            <button className="btn btn-primary" onClick={() => g.pressInteract()}>Bruk (E)</button>
            <button className="btn" onClick={() => g.pressMeasure()}>Mål (M)</button>
            <button className="btn" onClick={() => g.unlock()}>Pause</button>
          </div>
        </div>
      )}

      {/* Hjelpelinje med styring */}
      {locked && !modal && !touch && (
        <div className="hud-controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> gå</span>
          <span>{mode === 'locked' ? 'Mus: se rundt' : 'Hold inne museknappen og dra: se rundt'}</span>
          <span><kbd>←</kbd><kbd>→</kbd> snu</span>
          <span><kbd>Shift</kbd> løp</span>
          <span><kbd>E</kbd> bruk</span>
          <span><kbd>M</kbd> mål</span>
          <span><kbd>F</kbd> lykt</span>
          <span><kbd>Esc</kbd> pause</span>
          {mode === 'drag' && (
            <button className="hud-link" onClick={() => setShowPad((s) => !s)}>
              {showPad ? 'Skjul knapper' : 'Vis knapper'}
            </button>
          )}
        </div>
      )}

      {/* Verktøybeltet */}
      {st && !st.won && (
        <div className="toolbelt" role="toolbar" aria-label="Verktøy">
          {TOOLS.map((t) => (
            <button key={t.id} className={`tool-slot ${st.tool === t.id ? 'on' : ''}`} onClick={() => g?.setTool(t.id)} title={`${t.name} – ${t.use}`}>
              <span className="tool-icon">{t.icon}</span>
              <span className="tool-key">{t.key}</span>
              <span className="tool-name">{t.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pause */}
      {!locked && !modal && (
        <div className="game-overlay" onClick={() => { setStarted(true); g?.lock(); }}>
          <div className="game-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="small muted">Oppdrag for {level.customer}</div>
            <h2 style={{ margin: '2px 0 4px' }}>{level.name}</h2>
            <p className="small" style={{ marginTop: 0 }}>{level.story}</p>

            <div className="brief-h">Dette skal du gjøre</div>
            <div className="brief-net small">
              {level.net === 'IT'
                ? 'Huset har IT-anlegg: to faser, L1 og L2, og jord (PE). Det finnes ingen nøytral – begge lederne kan ha spenning.'
                : 'Huset har TN-anlegg: fase (L), nøytral (N) og jord (PE). Fasen er den farlige lederen.'}
            </div>
            <div className="brief-rooms">
              {st?.rooms.map((r, i) => {
                const t = template(r.spec);
                return (
                  <div key={r.def.id} className={`brief-room ${r.complete ? 'done' : ''}`}>
                    <div className="brief-room-head">
                      <span className="brief-n">{r.complete ? <CheckCircle2 size={15} /> : i + 1}</span>
                      <b>{r.def.name}</b>
                      <span className="muted">
                        · {t.name} · kurs {r.def.kurs}
                      </span>
                    </div>
                    {r.def.preset?.length ? (
                      <div className="brief-fault">⚠ Noen har koblet i denne boksen før. Test først, finn feilen og rett den.</div>
                    ) : null}
                    <div className="small muted">{t.info}</div>
                  </div>
                );
              })}
            </div>

            <div className="brief-h">Slik gjør du det – i denne rekkefølgen</div>
            <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.7, marginTop: 4 }}>
              <li>✋ Ta hånda (<kbd>1</kbd>), gå til <b>sikringsskapet</b> og slå av kursen til rommet.</li>
              <li>🔒 Velg <b>lås og skilt</b> (<kbd>2</kbd>) og sikre kursen mot innkobling.</li>
              <li>📟 Velg <b>spenningstesteren</b> (<kbd>3</kbd>) og mål på koblingsboksen. Den skal vise 0 V.</li>
              <li>🪛 Velg <b>skrutrekkeren</b> (<kbd>4</kbd>) og skru opp boksen.</li>
              <li>✂️ Avisoler lederne med <b>avisoleringstanga</b> (<kbd>5</kbd>), og 🔗 skjøt dem med <b>koblingsklemmer</b> (<kbd>6</kbd>).</li>
              <li>Lukk boksen. Ta hånda, fjern låsen (<kbd>2</kbd>) og slå på kursen. Test lyset med bryteren, og stikkontakter med 🔌 <b>kontrolltesteren</b> (<kbd>7</kbd>).</li>
            </ol>
            <div className="brief-colors small">
              <span><i style={{ background: '#92400e' }} /> brun = fase (L)</span>
              <span><i style={{ background: '#2563eb' }} /> blå = nøytral (N)</span>
              <span><i style={{ background: '#84cc16' }} /> gul/grønn = jord (PE)</span>
              <span><i style={{ background: '#111827' }} /> svart / <i style={{ background: '#9ca3af' }} /> grå = til lampen eller mellom brytere</span>
            </div>
            <p className="small muted" style={{ margin: '8px 0 12px' }}>
              ⭐⭐⭐ = ingen sikkerhetsbrudd og ingen hint · ⭐⭐ = ingen sikkerhetsbrudd · Åpner du en boks med spenning på, er det et sikkerhetsbrudd.
            </p>
            <div className="row">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setStarted(true);
                  g?.lock();
                }}
              >
                {started ? 'Fortsett' : 'Start oppdraget'}
              </button>
              <button className="btn" onClick={onExit}>
                Tilbake til menyen
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
              {touch
                ? 'Dra på skjermen for å se deg rundt, og bruk pilknappene for å gå.'
                : 'Gå med W A S D. Se deg rundt med musa (eller hold inne museknappen og dra). Piltastene ← → snur deg. Esc gir pause.'}
            </p>
          </div>
        </div>
      )}

      {/* Sikringsskap */}
      {panelOpen && st && g && (
        <div className="game-overlay">
          <div className="game-dialog">
            <div className="game-dialog-head">
              <span>Sikringsskap · {level.net === 'IT' ? 'IT-anlegg 230 V (L1, L2, PE)' : 'TN-anlegg 230 V (L, N, PE)'}</span>
              <span className="spacer" />
              <button className="icon-btn" onClick={() => setPanelOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="breaker-list">
              {st.breakers.map((b) => (
                <div key={b.id} className={`breaker ${b.on ? 'on' : ''}`}>
                  <div className="breaker-handle" onClick={() => g.toggleBreaker(b.id)} title="Slå av/på">
                    <div className="lever" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div className="small muted">
                      {b.on ? 'På – spenningssatt' : b.tripped ? 'Løst ut!' : 'Av'}
                      {b.locked && ' · låst og merket'}
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => g.toggleBreaker(b.id)}>
                    <Power size={14} /> {b.on ? 'Slå av' : 'Slå på'}
                  </button>
                  <button className={`btn btn-sm ${b.locked ? 'btn-primary' : ''}`} onClick={() => g.toggleLock(b.id)}>
                    {b.locked ? <Lock size={14} /> : <LockOpen size={14} />} {b.locked ? 'Fjern lås' : 'Lås og merk'}
                  </button>
                </div>
              ))}
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Slå av kursen og sett på lås og skilt før du arbeider. Mål deretter at det er spenningsløst ved koblingsboksen.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="spacer" />
              <button className="btn btn-primary" onClick={() => (setPanelOpen(false), g.lock())}>
                Lukk skapet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Koblingsboks */}
      {box && g && (
        <WiringPuzzle
          roomName={`${box.def.name} · ${st?.breakers.find((b) => b.id === box.def.kurs)?.name ?? ''}`}
          spec={box.spec}
          help={level.difficulty}
          conns={box.conns}
          tool={st!.tool}
          setTool={(t) => g.setTool(t)}
          stripped={box.stripped}
          onStrip={(id) => g.strip(box.def.id, id)}
          onChange={(c) => g.setConnections(box.def.id, c)}
          hintShown={hintRooms.has(box.def.id)}
          onHint={() => {
            g.useHint();
            setHintRooms((s) => new Set(s).add(box.def.id));
          }}
          onClose={() => {
            setBoxRoom(null);
            g.closeBox();
            g.lock();
          }}
        />
      )}

      {/* Seier */}
      {st?.won && (
        <div className="game-overlay">
          <div className="game-dialog" style={{ textAlign: 'center' }}>
            <Trophy size={48} color="#facc15" />
            <h2>Oppdraget er fullført!</h2>
            <p className="muted">{level.customer} har lys i alle rom igjen.</p>
            <div style={{ margin: '10px 0' }}>
              {[1, 2, 3].map((s) => (
                <Star key={s} size={34} color="#facc15" fill={stars >= s ? '#facc15' : 'none'} />
              ))}
            </div>
            <div className="win-stats">
              <div>
                <b>{st.score}</b>
                <span>poeng</span>
              </div>
              <div>
                <b>{time}</b>
                <span>tid</span>
              </div>
              <div>
                <b>{st.violations}</b>
                <span>sikkerhetsbrudd</span>
              </div>
            </div>
            {st.violations === 0 ? (
              <p className="small" style={{ color: '#86efac' }}>Ingen sikkerhetsbrudd – du fikk 200 bonuspoeng for trygt arbeid!</p>
            ) : (
              <p className="small" style={{ color: '#fca5a5' }}>Du åpnet en koblingsboks med spenning på. Prøv igjen og jobb i riktig rekkefølge for full score.</p>
            )}
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
              {story ? (
                <button className="btn btn-primary" onClick={onExit}>
                  Tilbake til Story Mode og lever jobben
                </button>
              ) : (
              <>
              <button className="btn" onClick={onExit}>
                Meny
              </button>
              {LEVELS.findIndex((l) => l.id === level.id) < LEVELS.length - 1 ? (
                <button className="btn btn-primary" onClick={onNext}>
                  Neste oppdrag
                </button>
              ) : (
                <button className="btn btn-primary" onClick={onExit}>
                  Ferdig – tilbake til menyen
                </button>
              )}
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {!st?.won && (
        <button className="game-exit btn btn-sm" onClick={onExit} title="Avslutt oppdraget">
          <RotateCcw size={14} /> {story ? 'Tilbake til Story Mode' : 'Meny'}
        </button>
      )}
    </div>
  );
}
