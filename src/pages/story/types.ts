// Datamodell for Story Mode – «Elektrokarrieren min».
// Alt innhold (kapitler, scener, oppdrag, personer, steder, butikkvarer) er rene data.
// Nye kapitler legges til ved å lage en ny fil i ./content/ og registrere den i ./content/index.ts.
import type { DocKind, SchematicMode } from '../../types';
import type { BankQuestion } from '../learn/QuestionBank';

/** Karrieretrinn. Merk: spillnivå i Story Mode betyr ikke bestått utdanning eller fagbrev i virkeligheten. */
export type Stage = 'vg1' | 'vg2' | 'laerling1' | 'laerling2' | 'fagarbeider';

export const STAGES: { id: Stage; name: string; short: string }[] = [
  { id: 'vg1', name: 'Elektro Vg1-elev', short: 'Vg1' },
  { id: 'vg2', name: 'Vg2-elev (elenergi)', short: 'Vg2' },
  { id: 'laerling1', name: 'Lærling', short: 'Lærling' },
  { id: 'laerling2', name: 'Erfaren lærling', short: 'Erfaren lærling' },
  { id: 'fagarbeider', name: 'Fagarbeider (i spillet)', short: 'Fagarbeider' },
];

export type FlagValue = boolean | number | string;

/** Endringer som skjer når man velger noe eller fullfører et oppdrag */
export interface Effects {
  xp?: number;
  money?: number;
  reputation?: number;
  /** Relasjon til personer (+/−) */
  relations?: Record<string, number>;
  flags?: Record<string, FlagValue>;
  /** Gjenstander man får */
  items?: string[];
  /** Linje i dagboka */
  journal?: string;
  /** Antall dager som går */
  days?: number;
}

/** Betingelser for at noe skal være tilgjengelig. Alle feltene som er satt må være oppfylt. */
export interface Condition {
  stage?: Stage[];
  flag?: string;
  /** Verdi flagget må ha (standard: sann) */
  equals?: FlagValue;
  notFlag?: string;
  minXp?: number;
  minReputation?: number;
  maxReputation?: number;
  minMoney?: number;
  completed?: string[];
  notCompleted?: string[];
  seen?: string[];
  item?: string;
  minRelation?: [string, number];
}

export type Speaker = string; // person-id, 'deg' eller 'forteller'

export interface Choice {
  text: string;
  next: string;
  effects?: Effects;
  if?: Condition;
  /** Vises som et lite merke, f.eks. «trygt valg» */
  tag?: string;
}

export interface DialogueNode {
  id: string;
  speaker?: Speaker;
  text: string;
  /** Uttrykk/stemning for personen (bare visuelt) */
  mood?: 'glad' | 'nøytral' | 'streng' | 'bekymret' | 'imponert';
  effects?: Effects;
  choices?: Choice[];
  next?: string;
  /** Avslutter dialogen. I scenario-oppdrag avgjør 'success'/'fail' resultatet. */
  end?: 'done' | 'success' | 'fail';
}

export interface Scene {
  id: string;
  title: string;
  location: string;
  /** Vises bare når betingelsen er oppfylt */
  if?: Condition;
  /** Kan bare spilles én gang (standard: ja) */
  repeatable?: boolean;
  /** Markeres som viktig hendelse i historien */
  main?: boolean;
  start: string;
  nodes: DialogueNode[];
  onComplete?: Effects;
}

// ---------------------------------------------------------------------------
// Arbeidsområder (oppdragstyper)
// ---------------------------------------------------------------------------
export interface ScenarioWorkspace {
  type: 'scenario';
  start: string;
  nodes: DialogueNode[];
}

export interface MatchWorkspace {
  type: 'match';
  prompt: string;
  /** Element som skal kobles til riktig svar. symbol = symbol-id som vises som bilde. */
  pairs: { item: string; answer: string; symbol?: string }[];
  /** Ekstra feil svaralternativer */
  distractors?: string[];
}

export interface QuizWorkspace {
  type: 'quiz';
  questions: BankQuestion[];
  /** Antall riktige som trengs */
  need: number;
}

export interface CalcWorkspace {
  type: 'calc';
  tasks: { q: string; answer: number; unit: string; /** relativ toleranse, f.eks. 0.02 */ tol?: number; hint: string; explanation: string }[];
}

/** Åpner de ekte verktøyene i ElektroStudio. Resultatet kontrolleres av en kontrollfunksjon. */
export interface EditorWorkspace {
  type: 'editor';
  kind: DocKind;
  mode?: SchematicMode;
  /** Navn på kontrollfunksjon i ./checkers.ts */
  checker: string;
  docName: string;
  instructions: string[];
}

export interface FaultWorkspace {
  type: 'faultfind';
  /** Navn på krets i ./circuits.ts */
  circuit: string;
  /** Feilen som legges inn (betegnelse på komponent, ev. symbol-id når flere har samme betegnelse, + type) */
  fault: { label: string; symbol?: string; kind: 'brudd' | 'kortslutning' };
  /** Svaralternativer. Riktig svar er det som peker på samme komponent som feilen. */
  candidates: { label: string; symbol?: string; text: string }[];
  /** Symptom som kunden/læreren beskriver */
  symptom: string;
}

export interface MaterialsWorkspace {
  type: 'materials';
  /** Navn på plantegning i ./circuits.ts (vises som bilde) */
  plan: string;
  description: string;
  items: { name: string; expected: number; unit: string; tol?: number }[];
}

export interface RiskWorkspace {
  type: 'risk';
  activity: string;
  hazards: { id: string; text: string; relevant: boolean; measure?: string }[];
  measures: string[];
}

export interface ReportWorkspace {
  type: 'report';
  context: string;
  fields: { key: string; label: string; placeholder?: string; minWords: number; mustMention?: string[] }[];
  /** Måletabell der spilleren fører inn verdier fra måleprotokollen */
  /** tol er relativ toleranse (0.01 = 1 %) */
  measurements?: { point: string; given: string; expected: number; unit: string; tol?: number }[];
  /** Lagre som rapport i Story-prosjektet */
  saveAsReport?: boolean;
}

export interface Game3dWorkspace {
  type: 'game3d';
  /** Brett-id i Elektrikerspillet */
  level: string;
  minStars?: number;
}

export type Workspace =
  | ScenarioWorkspace
  | MatchWorkspace
  | QuizWorkspace
  | CalcWorkspace
  | EditorWorkspace
  | FaultWorkspace
  | MaterialsWorkspace
  | RiskWorkspace
  | ReportWorkspace
  | Game3dWorkspace;

export interface Mission {
  id: string;
  chapter: string;
  title: string;
  location: string;
  giver: string;
  /** Betingelse for at oppdraget er låst opp */
  if?: Condition;
  /** Kan gjøres flere ganger (f.eks. ekstrajobber) */
  repeatable?: boolean;
  /** Må fullføres for å komme videre i kapitlet */
  core?: boolean;
  /** Ekstrajobb for penger */
  sideJob?: boolean;
  summary: string;
  story: string;
  goal: string;
  tools: string[];
  components?: string[];
  /** Gjenstander man må eie for å ta oppdraget */
  requiresItems?: string[];
  /** Kort dialog før oppdraget */
  intro?: { speaker: Speaker; text: string }[];
  workspace: Workspace;
  reward: Effects;
  /** Konsekvens ved mislykket forsøk */
  failEffects?: Effects;
  outro: { success: string; fail: string };
  /** Fag oppdraget gir karakter i (bare skoleårene) */
  subject?: Subject;
  /** Undervisning før oppdraget */
  lesson?: Lesson;
  /** Sikkerhetsmerknad som vises i oppdraget */
  safety?: string;
}

export interface Chapter {
  id: string;
  stage: Stage;
  number: number;
  title: string;
  description: string;
  /** Krav for å fullføre kapitlet (i tillegg til alle core-oppdrag) */
  requirements: { minXp?: number; minReputation?: number; flags?: string[]; text?: string };
  /** Scene som avslutter kapitlet (tilgjengelig når kravene er oppfylt) */
  finale: string;
  /** Trinn man går videre til etter kapitlet */
  nextStage?: Stage;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  personality: string;
  color: string;
  /** Emoji eller initialer som portrett */
  avatar: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  icon: string;
  if?: Condition;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'verktøy' | 'måleinstrument' | 'verneutstyr' | 'annet';
  if?: Condition;
}

export interface StoryContent {
  chapters: Chapter[];
  scenes: Scene[];
  missions: Mission[];
}

// ---------------------------------------------------------------------------
// Lagret tilstand
// ---------------------------------------------------------------------------
export type Active =
  | { kind: 'scene'; id: string; node: string }
  | { kind: 'mission'; id: string; phase: 'brief' | 'lesson' | 'work' | 'result'; startedAt: number; docId?: string; result?: MissionResult };

export interface MissionResult {
  ok: boolean;
  score: number;
  feedback: string[];
  link?: { label: string; to: string };
  /** Effektene som faktisk ble gitt (belønning eller konsekvens) */
  effects?: Effects;
  /** Karakter 1–6 (skoleoppdrag) */
  grade?: number;
  /** Nytt nivå dersom spilleren gikk opp */
  levelUp?: number;
}

export interface MissionRecord {
  best: number;
  attempts: number;
  /** Satt når oppdraget er gjennomført (bestått eller ikke). Skoleoppdrag har bare ett forsøk. */
  completedAt?: number;
  /** Om forsøket ble godkjent */
  passed?: boolean;
  /** Karakter 1–6 for skoleoppdrag */
  grade?: number;
  failed?: number;
  /** Tegningen i ElektroStudio som hører til oppdraget */
  docId?: string;
}

/** Fag i skoleårene (i spillet) */
export type Subject = 'yff' | 'elkretser' | 'styresystemer';

export interface YearResult {
  chapter: string;
  stage: Stage;
  /** Hvilket forsøk (1 = første gang) */
  attempt: number;
  grades: Partial<Record<Subject, number>>;
  passed: boolean;
  day: number;
}

/** Undervisning fra læreren før et oppdrag */
export interface LessonSlide {
  title: string;
  text: string;
  /** Symbol-id fra komponentbiblioteket som vises stort */
  symbol?: string;
  /** Formel eller regel som vises i en egen boks, f.eks. «I = U / R» */
  formula?: string;
  /** Regneeksempel eller praktisk eksempel */
  example?: string;
}

export interface Lesson {
  /** Person-id for læreren som underviser */
  teacher: string;
  title: string;
  slides: LessonSlide[];
  /** Kontrollspørsmål til slutt (teller ikke på karakteren). options[0] er riktig. */
  check?: { q: string; options: string[]; explanation: string };
}

export interface StoryState {
  version: 1;
  slot: number;
  playerName: string;
  stage: Stage;
  chapter: string;
  xp: number;
  money: number;
  reputation: number;
  relations: Record<string, number>;
  flags: Record<string, FlagValue>;
  missions: Record<string, MissionRecord>;
  seenScenes: string[];
  inventory: string[];
  location: string;
  day: number;
  /** Alder i spillet. Øker for hvert skoleår/lærlingår – og når et år må tas på nytt. */
  age?: number;
  /** Hvor mange ganger et kapittel (skoleår/fagprøve) er tatt på nytt */
  retakes?: Record<string, number>;
  /** Karakterkort for avsluttede skoleår */
  yearResults?: YearResult[];
  journal: { day: number; text: string }[];
  active?: Active;
  /** Prosjekt i ElektroStudio der tegninger fra oppdragene lagres */
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}
