// Spillmotor for Story Mode: lagring, betingelser, effekter, nivåer og tilgjengelighet.
import { create } from 'zustand';
import type { Active, Chapter, Condition, Effects, Mission, Scene, Stage, StoryState, Subject, YearResult } from './types';
import { STAGES } from './types';
import { CONTENT } from './content';
import { LOCATIONS, SHOP } from './world';
import { EXAM_CHAPTERS, GRADED_CHAPTERS, SUBJECTS } from './content/school';

const SLOT_KEY = (n: number) => `elektrostudio-story-slot-${n}`;
const LAST_SLOT_KEY = 'elektrostudio-story-last-slot';
export const SLOTS = [1, 2, 3];

// ---------------------------------------------------------------------------
// Lagring
// ---------------------------------------------------------------------------
export function readSlot(n: number): StoryState | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY(n));
    if (!raw) return null;
    const s = JSON.parse(raw) as StoryState;
    if (s?.version !== 1) return null;
    // Eldre lagringer mangler alder
    if (s.age === undefined) s.age = 16 + Math.max(0, STAGES.findIndex((x) => x.id === s.stage));
    return s;
  } catch {
    return null;
  }
}

function writeSlot(s: StoryState) {
  try {
    localStorage.setItem(SLOT_KEY(s.slot), JSON.stringify(s));
    localStorage.setItem(LAST_SLOT_KEY, String(s.slot));
  } catch {
    /* lagring utilgjengelig – spillet virker, men huskes ikke */
  }
}

export function lastSlot(): number | null {
  try {
    const n = Number(localStorage.getItem(LAST_SLOT_KEY));
    return SLOTS.includes(n) && readSlot(n) ? n : null;
  } catch {
    return null;
  }
}

export function deleteSlot(n: number) {
  try {
    localStorage.removeItem(SLOT_KEY(n));
  } catch {
    /* ignorer */
  }
}

export function newState(slot: number, playerName: string): StoryState {
  const now = Date.now();
  return {
    version: 1,
    slot,
    playerName: playerName.trim() || 'Elev',
    stage: 'vg1',
    chapter: CONTENT.chapters[0].id,
    xp: 0,
    money: 500,
    reputation: 50,
    relations: {},
    flags: {},
    missions: {},
    seenScenes: [],
    inventory: [],
    location: 'skole',
    day: 1,
    age: 16,
    journal: [{ day: 1, text: 'Første skoledag på elektro Vg1. Spent!' }],
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Nivåer
// ---------------------------------------------------------------------------
/** Nivå ut fra erfaringspoeng: 100, 250, 450, 700 … poeng for nivå 2, 3, 4, 5 … */
export function levelInfo(xp: number) {
  let level = 1;
  let need = 100;
  let base = 0;
  while (xp >= base + need) {
    base += need;
    level++;
    need = 100 + (level - 1) * 50;
  }
  return { level, into: xp - base, need };
}

export const stageInfo = (s: Stage) => STAGES.find((x) => x.id === s)!;

// ---------------------------------------------------------------------------
// Betingelser og effekter
// ---------------------------------------------------------------------------
export function check(c: Condition | undefined, s: StoryState): boolean {
  if (!c) return true;
  if (c.stage && !c.stage.includes(s.stage)) return false;
  if (c.flag !== undefined) {
    const v = s.flags[c.flag];
    if (c.equals === undefined ? !v : v !== c.equals) return false;
  }
  if (c.notFlag && s.flags[c.notFlag]) return false;
  if (c.minXp !== undefined && s.xp < c.minXp) return false;
  if (c.minReputation !== undefined && s.reputation < c.minReputation) return false;
  if (c.maxReputation !== undefined && s.reputation > c.maxReputation) return false;
  if (c.minMoney !== undefined && s.money < c.minMoney) return false;
  if (c.completed && !c.completed.every((m) => s.missions[m]?.completedAt)) return false;
  if (c.notCompleted && c.notCompleted.some((m) => s.missions[m]?.completedAt)) return false;
  if (c.seen && !c.seen.every((id) => s.seenScenes.includes(id))) return false;
  if (c.item && !s.inventory.includes(c.item)) return false;
  if (c.minRelation && (s.relations[c.minRelation[0]] ?? 0) < c.minRelation[1]) return false;
  return true;
}

/** Forklaring på hvorfor noe er låst */
export function lockReason(c: Condition | undefined, s: StoryState): string | null {
  if (!c || check(c, s)) return null;
  const parts: string[] = [];
  if (c.stage && !c.stage.includes(s.stage)) parts.push(`krever ${c.stage.map((x) => stageInfo(x).short).join('/')}`);
  if (c.minXp !== undefined && s.xp < c.minXp) parts.push(`krever ${c.minXp} XP`);
  if (c.minReputation !== undefined && s.reputation < c.minReputation) parts.push(`krever omdømme ${c.minReputation}`);
  if (c.completed) {
    const miss = c.completed.filter((m) => !s.missions[m]?.completedAt).map((m) => missionById(m)?.title ?? m);
    if (miss.length) parts.push(`fullfør først: ${miss.join(', ')}`);
  }
  if (c.item && !s.inventory.includes(c.item)) parts.push(`trenger ${SHOP.find((i) => i.id === c.item)?.name ?? c.item}`);
  if (c.minRelation) parts.push('du må bli bedre kjent med noen først');
  if (c.seen) {
    const miss = c.seen.filter((id) => !s.seenScenes.includes(id)).map((id) => `«${sceneById(id)?.title ?? id}»`);
    if (miss.length) parts.push(`skjer etter ${miss.join(', ')}`);
  }
  if ((c.flag !== undefined && !check({ flag: c.flag, equals: c.equals }, s)) || (c.notFlag && s.flags[c.notFlag])) parts.push('noe må skje i historien først');
  return parts.length ? parts.join(' · ') : 'ikke tilgjengelig ennå';
}

export function applyEffects(s: StoryState, e: Effects | undefined): StoryState {
  if (!e) return s;
  const n: StoryState = { ...s, relations: { ...s.relations }, flags: { ...s.flags }, inventory: [...s.inventory], journal: [...s.journal] };
  if (e.xp) n.xp = Math.max(0, n.xp + e.xp);
  if (e.money) n.money = Math.round(n.money + e.money);
  if (e.reputation) n.reputation = Math.max(0, Math.min(100, n.reputation + e.reputation));
  for (const [k, v] of Object.entries(e.relations ?? {})) n.relations[k] = (n.relations[k] ?? 0) + v;
  for (const [k, v] of Object.entries(e.flags ?? {})) n.flags[k] = v;
  for (const it of e.items ?? []) if (!n.inventory.includes(it)) n.inventory.push(it);
  if (e.days) n.day += e.days;
  if (e.journal) n.journal.push({ day: n.day, text: e.journal });
  return n;
}

// ---------------------------------------------------------------------------
// Innhold
// ---------------------------------------------------------------------------
export const missionById = (id: string) => CONTENT.missions.find((m) => m.id === id);
export const sceneById = (id: string) => CONTENT.scenes.find((x) => x.id === id);
export const chapterById = (id: string) => CONTENT.chapters.find((c) => c.id === id)!;
export const currentChapter = (s: StoryState) => chapterById(s.chapter);

export function locationsFor(s: StoryState) {
  return LOCATIONS.filter((l) => check(l.if, s));
}

export function scenesAt(s: StoryState, location: string): Scene[] {
  return CONTENT.scenes.filter((sc) => sc.location === location && (sc.repeatable || !s.seenScenes.includes(sc.id)) && check(sc.if, s) && !isFinaleLocked(sc, s) && !retakeHidden(sc, s));
}

/** Kapittelavslutningen vises først når kravene er oppfylt */
function isFinaleLocked(sc: Scene, s: StoryState) {
  const ch = CONTENT.chapters.find((c) => c.finale === sc.id);
  if (!ch) return false;
  return ch.id !== s.chapter || !chapterProgress(s, ch).ready || chapterOutcome(s, ch).failed;
}

/** Scenen som vises når et skoleår eller fagprøven ikke er bestått */
function retakeHidden(sc: Scene, s: StoryState) {
  if (!sc.id.startsWith('stryk_')) return false;
  const ch = currentChapter(s);
  return !(sc.id === `stryk_${ch.id}` && chapterProgress(s, ch).ready && chapterOutcome(s, ch).failed);
}

export interface MissionView {
  mission: Mission;
  status: 'tilgjengelig' | 'låst' | 'fullført';
  lock: string | null;
}

export function missionsAt(s: StoryState, location: string): MissionView[] {
  return CONTENT.missions
    .filter((m) => m.location === location && (m.chapter === s.chapter || m.sideJob || (m.repeatable && chapterIndex(m.chapter) <= chapterIndex(s.chapter))))
    .map((m) => {
      const done = !!s.missions[m.id]?.completedAt;
      const cond = { ...(m.if ?? {}), ...(m.requiresItems?.length ? {} : {}) };
      const itemsMissing = (m.requiresItems ?? []).filter((it) => !s.inventory.includes(it));
      const lock = lockReason(cond, s) ?? (itemsMissing.length ? `trenger ${itemsMissing.map((it) => SHOP.find((x) => x.id === it)?.name ?? it).join(', ')} (kjøp i Verktøybutikken)` : null);
      return { mission: m, status: done && !m.repeatable ? 'fullført' : lock ? 'låst' : 'tilgjengelig', lock } as MissionView;
    });
}

export const chapterIndex = (id: string) => CONTENT.chapters.findIndex((c) => c.id === id);

export function chapterProgress(s: StoryState, ch: Chapter) {
  const core = CONTENT.missions.filter((m) => m.chapter === ch.id && m.core);
  const doneCore = core.filter((m) => s.missions[m.id]?.completedAt);
  // Skoleårene avgjøres av karakterene, ikke av XP og omdømme
  const graded = GRADED_CHAPTERS.includes(ch.id);
  const reqs: { text: string; ok: boolean }[] = [
    { text: `Gjennomfør hovedoppdragene (${doneCore.length}/${core.length})`, ok: doneCore.length === core.length },
  ];
  if (ch.requirements.minXp && !graded) reqs.push({ text: `Minst ${ch.requirements.minXp} XP (du har ${s.xp})`, ok: s.xp >= ch.requirements.minXp });
  if (ch.requirements.minReputation && !graded) reqs.push({ text: `Omdømme minst ${ch.requirements.minReputation} (du har ${s.reputation})`, ok: s.reputation >= ch.requirements.minReputation });
  for (const f of ch.requirements.flags ?? []) reqs.push({ text: ch.requirements.text ?? f, ok: !!s.flags[f] });
  return { core, doneCore, reqs, ready: reqs.every((r) => r.ok) };
}

/** Hvor finnes det noe nytt å gjøre? (brukes til «!» på kartet) */
export function hasNews(s: StoryState, location: string) {
  if (scenesAt(s, location).some((x) => x.main) || missionsAt(s, location).some((m) => m.status === 'tilgjengelig' && !m.mission.sideJob && !m.mission.repeatable)) return true;
  // Butikken eller grossisten når neste steg er å kjøpe utstyr eller tjene penger
  return (location === 'butikk' || location === 'grossist') && nextHint(s).location === location;
}

/** Hva bør spilleren gjøre nå? Brukes så man aldri står fast uten å vite hvorfor. */
export function nextHint(s: StoryState): { text: string; location?: string; who?: string; title?: string } {
  const ch = currentChapter(s);
  if (s.flags.karriere_fullfort) return { text: 'Karrieren er fullført! Ta ekstrajobber hvis du vil.' };
  const locs = locationsFor(s);
  for (const l of locs) {
    const sc = scenesAt(s, l.id).find((x) => x.main);
    const who = sc?.nodes.find((n) => n.speaker && n.speaker !== 'forteller' && n.speaker !== 'deg')?.speaker;
    if (sc) return { text: `Gå til ${l.name}: «${sc.title}»`, location: l.id, who, title: sc.title };
  }
  for (const l of locs) {
    const mv = missionsAt(s, l.id).find((m) => m.status === 'tilgjengelig' && m.mission.core);
    if (mv) return { text: `Gå til ${l.name}: oppdraget «${mv.mission.title}»`, location: l.id, who: mv.mission.giver, title: mv.mission.title };
  }
  // Hovedoppdrag som bare mangler utstyr
  for (const m of CONTENT.missions) {
    if (m.chapter !== ch.id || !m.core || s.missions[m.id]?.completedAt || !check(m.if, s)) continue;
    const it = (m.requiresItems ?? []).map((id) => SHOP.find((x) => x.id === id)).find((x) => x && !s.inventory.includes(x.id));
    if (!it) continue;
    if (s.money >= it.price) return { text: `Kjøp ${it.name.toLowerCase()} i Verktøybutikken (${it.price} kr) – det trengs til «${m.title}».`, location: 'butikk' };
    return { text: `Du trenger ${it.name.toLowerCase()} (${it.price} kr) til «${m.title}», men har ${s.money} kr. Ta ekstrajobber på Elektrogrossisten.`, location: 'grossist' };
  }
  for (const l of locs) {
    const mv = missionsAt(s, l.id).find((m) => m.status === 'tilgjengelig' && !m.mission.sideJob && !m.mission.repeatable);
    if (mv) return { text: `Gå til ${l.name}: oppdraget «${mv.mission.title}»`, location: l.id };
  }
  const p = chapterProgress(s, ch);
  const missing = p.reqs.find((r) => !r.ok);
  if (missing) {
    const job = locs.find((l) => missionsAt(s, l.id).some((m) => m.status === 'tilgjengelig' && (m.mission.sideJob || m.mission.repeatable)));
    return { text: `Mangler: ${missing.text}. Ta ekstrajobber${job ? ` (${job.name})` : ''} for mer erfaring og penger.`, location: job?.id };
  }
  return { text: 'Se etter «!» – noen har kanskje noe nytt til deg.' };
}

// ---------------------------------------------------------------------------
// Karakterer, stryk og nye forsøk
// ---------------------------------------------------------------------------
export const isGraded = (chapterId: string) => GRADED_CHAPTERS.includes(chapterId);

export function subjectGrades(s: StoryState, chapterId: string) {
  return SUBJECTS.map((sub) => {
    const missions = CONTENT.missions.filter((m) => m.chapter === chapterId && m.subject === sub.id);
    const graded = missions.filter((m) => s.missions[m.id]?.grade !== undefined);
    const avg = graded.length ? graded.reduce((a, m) => a + (s.missions[m.id].grade ?? 0), 0) / graded.length : null;
    return { subject: sub, missions, graded, avg, grade: avg === null ? null : Math.max(1, Math.min(6, Math.round(avg))) };
  });
}

/** Er skoleåret eller fagprøven strøket? */
export function chapterOutcome(s: StoryState, ch: Chapter): { failed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (GRADED_CHAPTERS.includes(ch.id)) {
    for (const g of subjectGrades(s, ch.id)) if (g.grade === 1) reasons.push(`Karakter 1 i ${g.subject.name}`);
  }
  if (EXAM_CHAPTERS.includes(ch.id)) {
    for (const m of CONTENT.missions) {
      const r = s.missions[m.id];
      if (m.chapter === ch.id && m.core && r?.completedAt && !r.passed) reasons.push(`Ikke godkjent: ${m.title}`);
    }
  }
  return { failed: reasons.length > 0, reasons };
}

function yearResult(s: StoryState, ch: Chapter, passed: boolean): YearResult {
  const grades: Partial<Record<Subject, number>> = {};
  for (const g of subjectGrades(s, ch.id)) if (g.grade !== null) grades[g.subject.id] = g.grade;
  return { chapter: ch.id, stage: s.stage, attempt: (s.retakes?.[ch.id] ?? 0) + 1, grades, passed, day: s.day };
}

/** Avslutter en scene. Kapittelavslutning gir neste kapittel, stryk gir nytt forsøk på samme kapittel. */
export function completeScene(s: StoryState, sc: Scene): StoryState {
  let n = applyEffects(s, sc.onComplete);
  n = { ...n, seenScenes: n.seenScenes.includes(sc.id) ? n.seenScenes : [...n.seenScenes, sc.id], active: undefined };
  const cur = currentChapter(n);
  const school = GRADED_CHAPTERS.includes(cur.id);

  if (sc.id === `stryk_${cur.id}`) {
    const missions = { ...n.missions };
    for (const m of CONTENT.missions) if (m.chapter === cur.id && !m.repeatable && !m.sideJob) delete missions[m.id];
    const age = (n.age ?? 16) + (school ? 1 : 0);
    return {
      ...n,
      missions,
      retakes: { ...(n.retakes ?? {}), [cur.id]: (n.retakes?.[cur.id] ?? 0) + 1 },
      yearResults: [...(n.yearResults ?? []), yearResult(n, cur, false)],
      age,
      day: n.day + (school ? 60 : 30),
      flags: { ...n.flags, ...(school ? { eldre_enn_klassen: true } : {}) },
      journal: [
        ...n.journal,
        { day: n.day, text: school ? `Starter ${stageInfo(n.stage).short} på nytt – nå ${age} år, ett år eldre enn klassen.` : 'Melder meg opp til fagprøven på nytt etter mer praksis.' },
      ],
    };
  }

  const ch = CONTENT.chapters.find((c) => c.finale === sc.id);
  if (ch && ch.id === n.chapter) {
    if (school) n = { ...n, yearResults: [...(n.yearResults ?? []), yearResult(n, ch, true)] };
    const next = CONTENT.chapters[chapterIndex(ch.id) + 1];
    if (ch.nextStage) n.stage = ch.nextStage;
    if (next) {
      n.chapter = next.id;
      n.age = (n.age ?? 16) + 1;
      n.journal = [...n.journal, { day: n.day, text: `Kapittel ${ch.number} fullført! Nå starter «${next.title}».` }];
    } else {
      n.flags = { ...n.flags, karriere_fullfort: true };
      n.journal = [...n.journal, { day: n.day, text: 'Elektrokarrieren i spillet er fullført!' }];
    }
    if (!locationsFor(n).some((l) => l.id === n.location)) n.location = 'hjem';
  }
  return n;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface StoryStore {
  s: StoryState | null;
  load(slot: number): void;
  start(slot: number, name: string): void;
  quit(): void;
  update(fn: (s: StoryState) => StoryState): void;
  setActive(a: Active | undefined): void;
}

export const useStory = create<StoryStore>((set, get) => ({
  s: null,
  load(slot) {
    const s = readSlot(slot);
    if (s) set({ s });
  },
  start(slot, name) {
    const s = newState(slot, name);
    writeSlot(s);
    set({ s });
  },
  quit() {
    set({ s: null });
  },
  update(fn) {
    const cur = get().s;
    if (!cur) return;
    const n = { ...fn(cur), updatedAt: Date.now() };
    writeSlot(n);
    set({ s: n });
  },
  setActive(a) {
    get().update((s) => ({ ...s, active: a }));
  },
}));

/** Brukes av tegneverktøyet for å vise oppdragsbanner uten å laste hele Story Mode */
export function activeEditorMission(): { title: string; goal: string; instructions: string[]; docId: string } | null {
  const slot = lastSlot();
  if (!slot) return null;
  const s = readSlot(slot);
  const a = s?.active;
  if (!a || a.kind !== 'mission' || !a.docId) return null;
  const m = missionById(a.id);
  if (!m || m.workspace.type !== 'editor') return null;
  return { title: m.title, goal: m.goal, instructions: m.workspace.instructions, docId: a.docId };
}
