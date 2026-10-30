import {
  BoxSelect,
  Hand,
  Heading,
  MousePointer2,
  Home as RoomIcon,
  PenLine,
  Ruler,
  Spline,
  Square,
  StickyNote,
  Type,
  Cable,
  BrickWall,
  type LucideIcon,
} from 'lucide-react';
import type { DocKind } from '../types';

export type ToolId = 'select' | 'pan' | 'wire' | 'line' | 'cable' | 'wall' | 'room' | 'rect' | 'text' | 'heading' | 'note' | 'dimension';

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: LucideIcon;
  key: string;
  hint: string;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  select: { id: 'select', label: 'Velg og flytt', icon: MousePointer2, key: 'V', hint: 'Klikk for å velge, Shift+klikk for flere, dra i tomt område for å markere. Dra fra en terminal for å tegne ledning.' },
  pan: { id: 'pan', label: 'Panorer', icon: Hand, key: 'H', hint: 'Dra for å flytte tegnearket. Tips: hold mellomrom eller bruk midtre museknapp i alle verktøy.' },
  wire: { id: 'wire', label: 'Ledning', icon: Spline, key: 'W', hint: 'Klikk på en terminal for å starte, klikk for knekkpunkt, klikk på en terminal eller annen ledning for å avslutte. Dobbeltklikk/Enter avslutter, Esc avbryter.' },
  line: { id: 'line', label: 'Strek', icon: PenLine, key: 'L', hint: 'Fri strek (ikke elektrisk forbindelse). Dobbeltklikk/Enter avslutter.' },
  cable: { id: 'cable', label: 'Kabelrute', icon: Cable, key: 'K', hint: 'Tegn kabelføring. Lengden tas med i materiallisten. Dobbeltklikk/Enter avslutter.' },
  wall: { id: 'wall', label: 'Vegg', icon: BrickWall, key: 'M', hint: 'Klikk for hvert hjørne. Dobbeltklikk/Enter avslutter. Rutenett: 10 cm.' },
  room: { id: 'room', label: 'Rom', icon: RoomIcon, key: 'U', hint: 'Dra et rektangel for å lage et rom med fire vegger, navn og areal.' },
  rect: { id: 'rect', label: 'Ramme', icon: Square, key: 'B', hint: 'Dra for å tegne en ramme, f.eks. rundt en gruppe komponenter.' },
  text: { id: 'text', label: 'Tekst', icon: Type, key: 'T', hint: 'Klikk der teksten skal stå. Rediger i egenskapspanelet.' },
  heading: { id: 'heading', label: 'Overskrift', icon: Heading, key: 'O', hint: 'Klikk der overskriften skal stå.' },
  note: { id: 'note', label: 'Forklaring', icon: StickyNote, key: 'N', hint: 'Klikk for å legge til en forklarende merknad.' },
  dimension: { id: 'dimension', label: 'Mål', icon: Ruler, key: 'D', hint: 'Klikk startpunkt og sluttpunkt. Lengden vises i meter (1 rute = 10 cm).' },
};

export const KIND_TOOLS: Record<DocKind, ToolId[]> = {
  drawing: ['select', 'pan', 'wire', 'line', 'rect', 'text', 'heading', 'note', 'dimension'],
  schematic: ['select', 'pan', 'wire', 'line', 'rect', 'text', 'heading', 'note'],
  floorplan: ['select', 'pan', 'wall', 'room', 'cable', 'dimension', 'line', 'text', 'heading', 'note'],
  simulation: ['select', 'pan', 'wire', 'text', 'note'],
};

export const SELECT_ICON = BoxSelect;
