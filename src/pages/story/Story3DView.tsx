import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand, Lock, MousePointer2, Play, X } from 'lucide-react';
import type { Mission, Scene, StoryState } from './types';
import { check, hasNews, missionsAt, nextHint, scenesAt, useStory } from './engine';
import { LOCATIONS, char } from './world';
import { StoryWorld, type Npc3D, type Place3D, type Target3D } from './world3d';
import { EffectChips } from './EffectChips';

/** Hvem som «hører til» på hvert sted, også når de ikke har noe nytt */
const HOME: Record<string, string[]> = {
  skole: ['trond', 'ivar', 'jonas', 'amina'],
  verksted: ['mari'],
  grossist: ['tor'],
  bedrift: ['hanne', 'per', 'geir', 'emil'],
  byggeplass: ['geir'],
  kunder: ['olsen', 'hansen', 'jensen'],
  provested: ['sensor'],
};

const CLOSED_TEXT: Record<string, string> = {
  skole: 'du går ikke på skolen lenger',
  verksted: 'du går ikke på skolen lenger',
  bedrift: 'åpner når du har fått læreplass',
  byggeplass: 'åpner når du er lærling',
  kunder: 'åpner når du er lærling',
  provested: 'åpner når du er klar for fagprøven',
};

/** Hvem snakker i en scene? (første person som ikke er forteller eller deg) */
function sceneSpeaker(sc: Scene) {
  return sc.nodes.find((n) => n.speaker && n.speaker !== 'forteller' && n.speaker !== 'deg')?.speaker;
}

/** Riktig person for en scene eller et oppdrag ut fra hvor man er */
function peopleAt(s: StoryState, loc: string) {
  const scenes = scenesAt(s, loc);
  const missions = missionsAt(s, loc).filter((m) => m.status !== 'fullført');
  const ids = new Set<string>();
  for (const sc of scenes) {
    const sp = sceneSpeaker(sc);
    if (sp) ids.add(sp);
  }
  for (const m of missions) ids.add(m.mission.giver);
  for (const id of HOME[loc] ?? []) {
    // Klassekamerater og lærere bare i skoleårene, kunder bare når de har noe
    if (loc === 'skole' && id === 'ivar' && s.stage === 'vg1') continue;
    if (loc === 'skole' && id === 'trond' && s.stage === 'vg2') continue;
    if ((loc === 'skole' || loc === 'verksted') && !['vg1', 'vg2'].includes(s.stage)) continue;
    if (loc === 'skole' && (id === 'jonas' || id === 'amina') && s.flags.eldre_enn_klassen) continue;
    if (loc === 'kunder') continue;
    if (loc === 'bedrift' && (id === 'hanne' || id === 'per') && s.flags.firma && s.flags.firma !== (id === 'hanne' ? 'lynkobling' : 'nordlys')) continue;
    if (loc === 'bedrift' && id === 'emil' && !['laerling2', 'fagarbeider'].includes(s.stage)) continue;
    ids.add(id);
  }
  return [...ids]
    .map((id) => {
      const c = char(id);
      if (!c || id === 'deg' || id === 'forteller') return null;
      const news = scenes.some((sc) => sc.main && sceneSpeaker(sc) === id) || missions.some((m) => m.mission.giver === id && m.status === 'tilgjengelig' && !m.mission.sideJob && !m.mission.repeatable);
      return { id, name: c.name, role: c.role, color: c.color, mark: news ? '!' : '' } as Npc3D;
    })
    .filter((x): x is Npc3D => !!x)
    .sort((a, b) => (a.mark === b.mark ? 0 : a.mark ? -1 : 1));
}

type Panel = { kind: 'npc'; id: string } | { kind: 'place'; loc: string } | { kind: 'msg'; text: string };

export default function Story3DView({ s, activeContent, renderPlace }: { s: StoryState; activeContent: ReactNode | null; renderPlace: (loc: string) => ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const world = useRef<StoryWorld | null>(null);
  const update = useStory((x) => x.update);
  const setActiveStory = useStory((x) => x.setActive);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'locked' | 'drag'>('locked');
  const [inside, setInside] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const sRef = useRef(s);
  sRef.current = s;

  const places: Place3D[] = useMemo(
    () => LOCATIONS.map((l) => ({ id: l.id, name: l.name, icon: l.icon, open: check(l.if, s), lockText: CLOSED_TEXT[l.id], news: check(l.if, s) && hasNews(s, l.id) })),
    [s],
  );
  const placesRef = useRef(places);
  placesRef.current = places;

  // Lag verdenen én gang
  useEffect(() => {
    const el = holder.current!;
    const start = s.location;
    const w = new StoryWorld(
      el,
      {
        onPrompt: setPrompt,
        onActiveChange: setPlaying,
        onControlMode: setMode,
        onEnter: (place) => {
          setInside(place);
          if (place) update((x) => ({ ...x, location: place }));
        },
        onInteract: (t: Target3D) => {
          const st = sRef.current;
          if (st.active) return;
          if (t.kind === 'door') {
            const p = placesRef.current.find((x) => x.id === t.place);
            if (!p?.open) {
              w.pause();
              setPanel({ kind: 'msg', text: `${p?.name ?? 'Stedet'} er stengt – ${p?.lockText ?? 'ikke tilgjengelig ennå'}.` });
              return;
            }
            w.enter(t.place);
            return;
          }
          if (t.kind === 'exit') return w.exit();
          w.pause();
          const here = st.location;
          if (t.kind === 'npc') setPanel({ kind: 'npc', id: t.id });
          else if (t.kind === 'board') setPanel({ kind: 'place', loc: here });
          else if (t.kind === 'shop') setPanel({ kind: 'place', loc: 'butikk' });
          else if (t.kind === 'bed') setPanel({ kind: 'place', loc: 'hjem' });
        },
      },
      placesRef.current,
      places.find((p) => p.id === start)?.open ? start : null,
    );
    world.current = w;
    setInside(start && places.find((p) => p.id === start)?.open ? start : null);
    (window as unknown as { __story3d?: StoryWorld }).__story3d = w;
    return () => {
      w.dispose();
      world.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hold verdenen oppdatert med historien
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    w.setPlaces(places);
    w.setNpcs(inside ? peopleAt(s, inside) : []);
  }, [s, places, inside]);

  // Stopp styringen når noe vises oppå 3D
  const overlay = !!activeContent || !!panel;
  useEffect(() => {
    if (overlay) world.current?.pause();
  }, [overlay]);
  // Når en scene/oppdrag starter fra et panel, lukk panelet
  useEffect(() => {
    if (s.active) setPanel(null);
  }, [s.active]);

  const startScene = (sc: Scene) => setActiveStory({ kind: 'scene', id: sc.id, node: sc.start });
  const startMission = (m: Mission) => setActiveStory({ kind: 'mission', id: m.id, phase: 'brief', startedAt: Date.now(), docId: s.missions[m.id]?.docId });

  let panelBody: ReactNode = null;
  if (panel?.kind === 'msg') panelBody = <p>{panel.text}</p>;
  if (panel?.kind === 'place') panelBody = renderPlace(panel.loc);
  if (panel?.kind === 'npc') {
    const c = char(panel.id)!;
    const here = s.location;
    const scenes = scenesAt(s, here).filter((sc) => sceneSpeaker(sc) === panel.id);
    const missions = missionsAt(s, here).filter((m) => m.mission.giver === panel.id && m.status !== 'fullført');
    panelBody = (
      <div className="npc-panel">
        <div className="npc-head">
          <span className="dlg-avatar big" style={{ background: c.color }}>
            {c.avatar}
          </span>
          <div>
            <h3>{c.name}</h3>
            <div className="small muted">{c.role}</div>
            <p className="small">{c.personality}</p>
          </div>
        </div>
        {scenes.map((sc) => (
          <button key={sc.id} className="dlg-choice" onClick={() => startScene(sc)}>
            <span className="dlg-choice-n">💬</span>
            <span>{sc.title}</span>
            {sc.main && <span className="badge badge-yellow">Historie</span>}
          </button>
        ))}
        {missions.map(({ mission: m, status, lock }) => (
          <div key={m.id} className={`npc-mission ${status === 'låst' ? 'locked' : ''}`}>
            <div style={{ flex: 1 }}>
              <b>{m.title}</b>
              <div className="small muted">{m.summary}</div>
              <EffectChips e={m.reward} />
              {lock && (
                <div className="small lock">
                  <Lock size={12} /> {lock}
                </div>
              )}
            </div>
            {status !== 'låst' && (
              <button className="btn btn-primary btn-sm" onClick={() => startMission(m)}>
                <Play size={14} /> {m.repeatable && s.missions[m.id]?.attempts ? 'Ta igjen' : 'Ta oppdraget'}
              </button>
            )}
          </div>
        ))}
        {scenes.length === 0 && missions.length === 0 && (
          <div className="notice notice-info small">
            «Hei! Jeg har ikke noe til deg akkurat nå.» <br />
            <b>Tips:</b> {nextHint(s).text}
          </div>
        )}
      </div>
    );
  }

  const hint = nextHint(s);
  // Inne på riktig sted: si hvem du skal snakke med
  const hintText =
    inside && hint.location === inside && hint.title
      ? hint.who && char(hint.who)
        ? `Snakk med ${char(hint.who)!.name} her inne: «${hint.title}»`
        : `Les oppslagstavla her inne: «${hint.title}»`
      : hint.text;

  return (
    <div className="s3d">
      <div ref={holder} className="s3d-canvas" />
      {!overlay && (
        <div className="s3d-hud">
          <div className="s3d-hint">
            <b>Neste steg:</b> {hintText}
          </div>
          {prompt && <div className={`s3d-prompt ${prompt.startsWith('🔒') ? 'locked' : ''}`}>{prompt}</div>}
          {playing && <div className="s3d-cross" />}
          {playing && (
            <div className="s3d-touch">
              <div className="s3d-pad">
                <button onPointerDown={() => world.current?.setTouch(1, 0)} onPointerUp={() => world.current?.setTouch(0, 0)} onPointerLeave={() => world.current?.setTouch(0, 0)} aria-label="Gå fram">
                  <ArrowUp size={18} />
                </button>
                <div>
                  <button onPointerDown={() => world.current?.setTouch(0, 1)} onPointerUp={() => world.current?.setTouch(0, 0)} onPointerLeave={() => world.current?.setTouch(0, 0)} aria-label="Snu til venstre">
                    <ArrowLeft size={18} />
                  </button>
                  <button onPointerDown={() => world.current?.setTouch(-1, 0)} onPointerUp={() => world.current?.setTouch(0, 0)} onPointerLeave={() => world.current?.setTouch(0, 0)} aria-label="Gå bakover">
                    <ArrowDown size={18} />
                  </button>
                  <button onPointerDown={() => world.current?.setTouch(0, -1)} onPointerUp={() => world.current?.setTouch(0, 0)} onPointerLeave={() => world.current?.setTouch(0, 0)} aria-label="Snu til høyre">
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
              <button className="btn btn-primary s3d-use" onClick={() => world.current?.pressInteract()} disabled={!prompt || prompt.startsWith('🔒')}>
                <Hand size={16} /> Bruk
              </button>
            </div>
          )}
          {playing && mode === 'drag' && <div className="s3d-mode small">Dra med musa for å se deg rundt · Esc for pause</div>}
        </div>
      )}
      {!overlay && !playing && (
        <button className="s3d-start" onClick={() => world.current?.lock()}>
          <MousePointer2 size={28} />
          <b>Klikk for å gå rundt</b>
          <span className="small">
            W A S D / piltaster: gå · mus: se deg rundt · E eller klikk: snakk og gå inn · Shift: løp · Esc: pause
          </span>
          <span className="small muted">{inside ? `Du er i: ${LOCATIONS.find((l) => l.id === inside)?.name}` : 'Du er ute i byen'}</span>
        </button>
      )}
      {overlay && (
        <div className="s3d-overlay">
          <div className="s3d-panel">
            {!activeContent && (
              <button className="icon-btn s3d-close" onClick={() => setPanel(null)} aria-label="Lukk">
                <X size={18} />
              </button>
            )}
            {activeContent ?? panelBody}
          </div>
        </div>
      )}
    </div>
  );
}

