import type { ReactNode } from 'react';
import type { DocKind } from '../types';

export type SymbolCategory = 'elektrisk' | 'installasjon' | 'plan' | 'dokumentasjon';

export const CATEGORY_LABEL: Record<SymbolCategory, string> = {
  elektrisk: 'Elektriske komponenter',
  installasjon: 'Installasjonsmateriell',
  plan: 'Plansymboler (plantegning)',
  dokumentasjon: 'Dokumentasjonssymboler',
};

/** Hvordan komponenten oppfører seg i simulatoren. */
export type SimRole =
  | 'source'
  | 'switch'
  | 'pushbutton'
  | 'changeover'
  | 'lamp'
  | 'led'
  | 'resistor'
  | 'fuse'
  | 'breaker'
  | 'ground'
  | 'conductor'
  | 'coil'
  | 'timer-on'
  | 'timer-off'
  | 'relay-no'
  | 'relay-nc'
  | 'motor'
  | 'bell'
  | 'overload-nc';

export interface TerminalDef {
  id: string;
  x: number;
  y: number;
  /** Standard klemmenummer / navn */
  name: string;
}

export interface PropDef {
  key: string;
  label: string;
  unit?: string;
  default: string;
  options?: string[];
  hint?: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Visuell tilstand fra simulatoren */
export interface SimVisual {
  closed?: boolean;
  level?: number; // 0..1, f.eks. lysstyrke
  blown?: boolean;
  energized?: boolean;
}

export interface RenderCtx {
  props: Record<string, string>;
  sim?: SimVisual;
  /** Arkfarge (brukes for å «maskere» f.eks. vegg bak dør/vindu) */
  paper: string;
}

export interface SymbolDef {
  id: string;
  name: string;
  category: SymbolCategory;
  group: string;
  description: string;
  /** Foreslått bokstavkode for referansebetegnelse (tom = ingen betegnelse) */
  prefix: string;
  box: Box | ((props: Record<string, string>) => Box);
  terminals: TerminalDef[];
  props: PropDef[];
  standard: string;
  kinds: DocKind[];
  sim?: SimRole;
  /** Terminalpar som er ledende internt (f.eks. klemmer) */
  bridges?: [string, string][];
  render: (ctx: RenderCtx) => ReactNode;
  summary?: (props: Record<string, string>) => string;
  /** Kort forklaring av virkemåte */
  howItWorks?: string;
  /** Plansymbol som tegnes i virkelig størrelse (dør, vindu, kanal) og ikke skal forstørres */
  realSize?: boolean;
}

/** Plansymboler forstørres slik at de er lesbare i målestokk (1 enhet = 1 cm). */
export const PLAN_SYMBOL_SCALE = 2.5;
export function symbolScale(def: { category: SymbolCategory; realSize?: boolean } | undefined): number {
  return def && def.category === 'plan' && !def.realSize ? PLAN_SYMBOL_SCALE : 1;
}
