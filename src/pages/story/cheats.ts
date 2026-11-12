// Juksekoder i Story Mode: hopp over et år og velg karakterene selv.
// Bare for moro skyld – lagringen merkes med at juks er brukt.
import type { Scene, StoryState, Subject } from './types';
import { CONTENT } from './content';
import { GRADED_CHAPTERS } from './content/school';
import { applyEffects, chapterOutcome, chapterProgress, check, completeScene, currentChapter, locationsFor, scenesAt, stageInfo } from './engine';

/** Kodene som åpner juksemenyen (store/små bokstaver spiller ingen rolle) */
export const CHEAT_CODES = ['JUKS', 'HOPPÅR', 'HOPPAAR'];
export const isCheatCode = (code: string) => CHEAT_CODES.includes(code.trim().toUpperCase());

/** Typisk poengsum for en karakter, så resultatet ser riktig ut i oversikten */
const SCORE_FOR: Record<number, number> = { 1: 10, 2: 35, 3: 52, 4: 68, 5: 85, 6: 100 };

/** Spiller gjennom en dialog automatisk. Velger «trygt valg» eller første lovlige valg. */
function walkScene(s: StoryState, sc: Scene): StoryState {
  const byId = new Map(sc.nodes.map((n) => [n.id, n]));
  let node = byId.get(sc.start);
  let n = s;
  for (let i = 0; node && i < 80; i++) {
    n = applyEffects(n, node.effects);
    if (node.end) break;
    if (node.choices?.length) {
      const ok = node.choices.filter((c) => check(c.if, n));
      const pick = ok.find((c) => c.tag) ?? ok[0];
      if (!pick) break;
      n = applyEffects(n, pick.effects);
      node = byId.get(pick.next);
    } else {
      node = node.next ? byId.get(node.next) : undefined;
    }
  }
  return completeScene(n, sc);
}

/** Spiller hovedscenene i kapitlet som er tilgjengelige nå (ikke avslutningen) */
function walkChapterScenes(s: StoryState, chapterId: string, finale: string): StoryState {
  let n = s;
  for (let guard = 0; guard < 40; guard++) {
    const sc = locationsFor(n)
      .flatMap((l) => scenesAt(n, l.id))
      .find((x) => x.id.startsWith(`${chapterId}_`) && x.id !== finale && !x.repeatable && !n.seenScenes.includes(x.id));
    if (!sc) break;
    n = walkScene(n, sc);
  }
  return n;
}

export interface SkipOptions {
  /** Karakter per fag (bare skoleårene) */
  grades: Record<Subject, number>;
  /** Fagprøven: stryk med vilje */
  failExam?: boolean;
}

/**
 * Hopper over resten av kapitlet (skoleåret, lærlingåret eller fagprøven).
 * Alle hovedoppdrag blir gjort med karakterene du har valgt. Får du 1 i et fag, må året tas på nytt – som ellers i spillet.
 */
export function skipYear(s: StoryState, opt: SkipOptions): StoryState {
  if (s.flags.karriere_fullfort) return s;
  const ch = currentChapter(s);
  const graded = GRADED_CHAPTERS.includes(ch.id);
  let n: StoryState = { ...s, active: undefined, flags: { ...s.flags, juks_brukt: true } };

  for (let round = 0; round < 4; round++) {
    n = walkChapterScenes(n, ch.id, ch.finale);
    const missions = { ...n.missions };
    let changed = false;
    for (const m of CONTENT.missions) {
      if (m.chapter !== ch.id || m.sideJob || m.repeatable || missions[m.id]?.completedAt) continue;
      const grade = m.subject ? opt.grades[m.subject] : undefined;
      const passed = grade !== undefined ? grade >= 3 : !(opt.failExam && m.core);
      missions[m.id] = { best: grade !== undefined ? SCORE_FOR[grade] : passed ? 100 : 0, attempts: 1, completedAt: Date.now(), passed, grade };
      n = { ...n, missions };
      if (passed) n = applyEffects(n, { ...m.reward, journal: undefined, days: undefined });
      changed = true;
    }
    if (!changed) break;
  }

  // Krav som XP og omdømme i lærlingårene oppfylles også
  const req = ch.requirements;
  if (!graded) {
    if (req.minXp && n.xp < req.minXp) n = { ...n, xp: req.minXp };
    if (req.minReputation && n.reputation < req.minReputation) n = { ...n, reputation: req.minReputation };
  }
  for (const f of req.flags ?? []) if (!n.flags[f]) n = { ...n, flags: { ...n.flags, [f]: true } };

  const days = graded ? 150 : 120;
  n = { ...n, day: n.day + days, journal: [...n.journal, { day: n.day + days, text: `Juksekode: hoppet over resten av «${ch.title}» (${stageInfo(n.stage).short}).` }] };

  if (!chapterProgress(n, ch).ready) return n;
  const finale = CONTENT.scenes.find((x) => x.id === (chapterOutcome(n, ch).failed ? `stryk_${ch.id}` : ch.finale));
  return finale ? walkScene(n, finale) : n;
}

/** Endrer karakterene på skoleoppdragene du allerede har gjort i år */
export function setGrades(s: StoryState, grades: Record<Subject, number>): StoryState {
  const ch = currentChapter(s);
  const missions = { ...s.missions };
  for (const m of CONTENT.missions) {
    const r = missions[m.id];
    if (m.chapter !== ch.id || !m.subject || !r?.completedAt) continue;
    const g = grades[m.subject];
    missions[m.id] = { ...r, grade: g, best: SCORE_FOR[g], passed: g >= 3 };
  }
  return { ...s, missions, flags: { ...s.flags, juks_brukt: true } };
}
