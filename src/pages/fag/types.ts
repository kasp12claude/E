// Fag og quiz: felles typer for spørsmålsbankene.
import type { Subject } from '../story/types';

export type Level = 'lett' | 'middels' | 'vanskelig' | 'super';

export interface FagQuestion {
  q: string;
  /** Første alternativ er alltid det riktige. Rekkefølgen stokkes ved visning. Alltid 4 alternativer. */
  options: [string, string, string, string];
  hint: string;
  explanation: string;
}

export type Bank = Record<Level, FagQuestion[]>;

export type { Subject };
