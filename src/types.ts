// Felles datamodell for ElektroStudio.
// Alt som lagres er vanlige JSON-objekter, slik at modellen senere kan synkroniseres mot en sky-tjeneste.

export interface Pt {
  x: number;
  y: number;
}

export type DocKind = 'drawing' | 'schematic' | 'floorplan' | 'simulation';

export type SchematicMode =
  | 'enlinje'
  | 'flerlinje'
  | 'styrestrom'
  | 'effektstrom'
  | 'lavspenning'
  | 'motorstyring'
  | 'prinsipp'
  | 'ovingsoppgave';

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot';

/** Referanse til en tilkoblingsterminal på en komponent. */
export interface TermRef {
  el: string;
  t: string;
}

interface BaseEl {
  id: string;
  color?: string;
}

export interface ComponentEl extends BaseEl {
  type: 'component';
  symbolId: string;
  x: number;
  y: number;
  rot: number; // 0, 90, 180, 270
  flip?: boolean;
  /** Referansebetegnelse, f.eks. Q1, F1, K1 */
  label: string;
  showLabel?: boolean;
  props: Record<string, string>;
  /** Overstyrte klemmenummer per terminal-id */
  terminalNumbers?: Record<string, string>;
}

export type TextVariant = 'text' | 'heading' | 'note' | 'room';

export interface TextEl extends BaseEl {
  type: 'text';
  x: number;
  y: number;
  text: string;
  size: number;
  variant: TextVariant;
  bold?: boolean;
}

export type WireKind = 'wire' | 'cable' | 'line';

export interface WireEl extends BaseEl {
  type: 'wire';
  kind: WireKind;
  points: Pt[];
  start?: TermRef;
  end?: TermRef;
  lineStyle: LineStyle;
  width: number;
  /** Ledningsnummer / kabelbetegnelse */
  wireNo?: string;
}

export interface WallEl extends BaseEl {
  type: 'wall';
  points: Pt[];
  thickness: number;
  closed?: boolean;
}

export interface DimensionEl extends BaseEl {
  type: 'dimension';
  a: Pt;
  b: Pt;
  offset: number;
}

export interface RectEl extends BaseEl {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  lineStyle: LineStyle;
  /** Rom: navn vises i midten sammen med areal */
  roomName?: string;
}

export type Element = ComponentEl | TextEl | WireEl | WallEl | DimensionEl | RectEl;

export interface SheetSettings {
  show: boolean;
  size: 'A4' | 'A3';
  orientation: 'landscape' | 'portrait';
}

export interface DrawingDoc {
  id: string;
  kind: DocKind;
  name: string;
  mode?: SchematicMode;
  placement: 'manual' | 'auto';
  showTerminals: boolean;
  sheet: SheetSettings;
  /** Oppgavetekst for øvingsoppgaver */
  taskText?: string;
  elements: Element[];
  createdAt: number;
  updatedAt: number;
}

export type TaskStatus = 'ikke-startet' | 'pagar' | 'ferdig' | 'blokkert';

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  start?: string; // ISO-dato (yyyy-mm-dd)
  due?: string;
  responsible?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface MaterialItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  note?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  have: boolean;
}

export interface PlanData {
  tasks: PlanTask[];
  checklists: Checklist[];
  materials: MaterialItem[];
  tools: ToolItem[];
  notes: string;
  startDate?: string;
  endDate?: string;
}

export interface SavedCalc {
  id: string;
  title: string;
  calcType: string;
  inputs: Record<string, string>;
  /** Ferdig formatert resultat med utregning, lagret som tekst */
  result: string;
  createdAt: number;
}

export type ReportSectionKind = 'text' | 'list' | 'table' | 'checklist' | 'drawing' | 'images';

export interface ReportSection {
  id: string;
  title: string;
  kind: ReportSectionKind;
  help?: string;
  text: string;
  items?: ChecklistItem[];
  columns?: string[];
  rows?: string[][];
  drawingIds?: string[];
  imageIds?: string[];
}

export interface Report {
  id: string;
  title: string;
  template: 'standard' | 'skole';
  author: string;
  className: string;
  date: string;
  sections: ReportSection[];
  createdAt: number;
  updatedAt: number;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
}

export interface Project {
  id: string;
  version: 1;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  docs: DrawingDoc[];
  plan: PlanData;
  notes: string;
  calculations: SavedCalc[];
  reports: Report[];
  attachments: AttachmentMeta[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  updatedAt: number;
  createdAt: number;
  docCount: number;
}
