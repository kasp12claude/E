// Ferdige eksempelkretser for simulatoren og læringsdelen.
import type { ComponentEl, DrawingDoc, Element, Pt, TextEl, WireEl } from '../types';
import { defaultProps, getSymbol } from '../library/symbols';
import { terminalPos } from '../editor/geometry';
import { newDoc } from '../store/factories';
import { uid } from '../utils/id';

export function comp(symbolId: string, x: number, y: number, label: string, props: Record<string, string> = {}, rot = 0): ComponentEl {
  const def = getSymbol(symbolId)!;
  return { id: uid('c'), type: 'component', symbolId, x, y, rot, label, showLabel: true, props: { ...defaultProps(def), ...props } };
}

export function wire(a: [ComponentEl, string] | Pt, b: [ComponentEl, string] | Pt, via: Pt[] = [], wireNo?: string): WireEl {
  const pos = (e: [ComponentEl, string] | Pt): Pt => {
    if (Array.isArray(e)) {
      const t = terminalPos(e[0], e[1]);
      if (!t) throw new Error(`Ukjent terminal ${e[1]} på ${e[0].symbolId}`);
      return { x: t.x, y: t.y };
    }
    return e;
  };
  return {
    id: uid('w'),
    type: 'wire',
    kind: 'wire',
    points: [pos(a), ...via, pos(b)],
    start: Array.isArray(a) ? { el: a[0].id, t: a[1] } : undefined,
    end: Array.isArray(b) ? { el: b[0].id, t: b[1] } : undefined,
    lineStyle: 'solid',
    width: 2,
    wireNo,
  };
}

export function note(x: number, y: number, text: string, variant: TextEl['variant'] = 'note', size = 12): TextEl {
  return { id: uid('t'), type: 'text', x, y, text, size, variant };
}

export interface CircuitExample {
  id: string;
  name: string;
  description: string;
  level: 'Grunnleggende' | 'Middels' | 'Viderekommen';
  build: () => Element[];
}

export const EXAMPLES: CircuitExample[] = [
  {
    id: 'enkel',
    name: 'Enkel lampekrets',
    description: 'Strømkilde, bryter og lampe. Lukk bryteren og se at lampen lyser.',
    level: 'Grunnleggende',
    build: () => {
      const G1 = comp('dc-source', 200, 300, 'G1', { U: '12' });
      const S1 = comp('switch-no', 400, 200, 'S1', {}, 90);
      const E1 = comp('lamp', 600, 300, 'E1', { U: '12', P: '5' });
      return [
        G1,
        S1,
        E1,
        wire([G1, '+'], [S1, '2'], [{ x: 200, y: 200 }]),
        wire([S1, '1'], [E1, '1'], [{ x: 600, y: 200 }]),
        wire([E1, '2'], [G1, '-'], [{ x: 600, y: 400 }, { x: 200, y: 400 }]),
        note(260, 470, 'Klikk på S1 for å lukke/åpne bryteren.'),
      ];
    },
  },
  {
    id: 'serie',
    name: 'Seriekobling av to lamper',
    description: 'To like lamper i serie deler spenningen. Hver lampe får halv spenning og lyser svakere.',
    level: 'Grunnleggende',
    build: () => {
      const G1 = comp('dc-source', 200, 310, 'G1', { U: '12' });
      const S1 = comp('switch-no', 400, 160, 'S1', { state: 'Lukket' }, 90);
      const E1 = comp('lamp', 600, 250, 'E1');
      const E2 = comp('lamp', 600, 370, 'E2');
      return [
        G1,
        S1,
        E1,
        E2,
        wire([G1, '+'], [S1, '2'], [{ x: 200, y: 160 }]),
        wire([S1, '1'], [E1, '1'], [{ x: 600, y: 160 }]),
        wire([E1, '2'], [E2, '1']),
        wire([E2, '2'], [G1, '-'], [{ x: 600, y: 460 }, { x: 200, y: 460 }]),
        note(260, 520, 'I serie går den samme strømmen gjennom begge lampene. Spenningen deles.'),
      ];
    },
  },
  {
    id: 'parallell',
    name: 'Parallellkobling av to lamper',
    description: 'To lamper i parallell får begge full spenning. Strømmen fra kilden blir summen av greinstrømmene.',
    level: 'Grunnleggende',
    build: () => {
      const G1 = comp('dc-source', 200, 300, 'G1', { U: '12' });
      const S1 = comp('switch-no', 380, 180, 'S1', { state: 'Lukket' }, 90);
      const E1 = comp('lamp', 550, 300, 'E1');
      const E2 = comp('lamp', 700, 300, 'E2');
      return [
        G1,
        S1,
        E1,
        E2,
        wire([G1, '+'], [S1, '2'], [{ x: 200, y: 180 }]),
        wire([S1, '1'], [E1, '1'], [{ x: 550, y: 180 }]),
        wire([E2, '1'], { x: 550, y: 180 }, [{ x: 700, y: 180 }]),
        wire([E1, '2'], [G1, '-'], [{ x: 550, y: 420 }, { x: 200, y: 420 }]),
        wire([E2, '2'], { x: 550, y: 420 }, [{ x: 700, y: 420 }]),
        note(260, 480, 'I parallell har alle greinene samme spenning. Strømmene legges sammen.'),
      ];
    },
  },
  {
    id: 'trapp',
    name: 'Trappekobling (to vekselbrytere)',
    description: 'Lampen kan slås av og på fra to steder. Klikk på S1 eller S2 for å skifte stilling.',
    level: 'Middels',
    build: () => {
      const G1 = comp('dc-source', 200, 320, 'G1', { U: '12' });
      const S1 = comp('changeover', 350, 200, 'S1', { pos: '1' }, 90);
      const S2 = comp('changeover', 550, 200, 'S2', { pos: '1' }, 270);
      const E1 = comp('lamp', 700, 320, 'E1');
      return [
        G1,
        S1,
        S2,
        E1,
        wire([G1, '+'], [S1, 'C'], [{ x: 200, y: 200 }]),
        wire([S1, '1'], [S2, '2']),
        wire([S1, '2'], [S2, '1']),
        wire([S2, 'C'], [E1, '1'], [{ x: 700, y: 200 }]),
        wire([E1, '2'], [G1, '-'], [{ x: 700, y: 430 }, { x: 200, y: 430 }]),
        note(260, 490, 'De to ledningene mellom bryterne kalles korrespondanseledere.'),
      ];
    },
  },
  {
    id: 'led',
    name: 'LED med formotstand',
    description: 'Formotstanden begrenser strømmen gjennom LED-en. Prøv å endre motstanden og se hva som skjer.',
    level: 'Middels',
    build: () => {
      const G1 = comp('dc-source', 200, 300, 'G1', { U: '9' });
      const S1 = comp('switch-no', 200, 180, 'S1', { state: 'Lukket' });
      const R1 = comp('resistor', 400, 120, 'R1', { R: '330' }, 90);
      const P1 = comp('led', 600, 300, 'P1');
      return [
        G1,
        S1,
        R1,
        P1,
        wire([G1, '+'], [S1, '2']),
        wire([S1, '1'], [R1, '2'], [{ x: 200, y: 120 }]),
        wire([R1, '1'], [P1, 'A'], [{ x: 600, y: 120 }]),
        wire([P1, 'K'], [G1, '-'], [{ x: 600, y: 420 }, { x: 200, y: 420 }]),
        note(260, 480, 'R = (U − Uf) / If = (9 V − 2 V) / 0,02 A ≈ 350 Ω → nærmeste standardverdi 330 Ω.'),
      ];
    },
  },
  {
    id: 'selvhold',
    name: 'Selvholdekrets med relé',
    description: 'START (S2) trekker reléet K1. K1 holder seg selv inne til STOPP (S1) trykkes. Klassisk styrestrømkrets.',
    level: 'Viderekommen',
    build: () => {
      const G1 = comp('dc-source', 100, 300, 'G1', { U: '12' });
      const S1 = comp('pushbutton-nc', 300, 170, 'S1');
      const S2 = comp('pushbutton-no', 300, 270, 'S2');
      const K1h = comp('relay-no', 400, 270, 'K1');
      const K1 = comp('relay-coil', 300, 400, 'K1', { Uc: '12', Rc: '240' });
      const K1b = comp('relay-no', 560, 270, 'K1');
      const K1b2 = { ...K1b, terminalNumbers: { '1': '23', '2': '24' } };
      const E1 = comp('lamp', 560, 400, 'E1');
      return [
        G1,
        S1,
        S2,
        K1h,
        K1,
        K1b2,
        E1,
        wire([G1, '+'], [S1, '1'], [{ x: 100, y: 100 }, { x: 300, y: 100 }]),
        wire([S1, '2'], [S2, '1']),
        wire([K1h, '1'], { x: 300, y: 220 }, [{ x: 400, y: 220 }]),
        wire([S2, '2'], [K1, 'A1']),
        wire([K1h, '2'], { x: 300, y: 330 }, [{ x: 400, y: 330 }]),
        wire([K1, 'A2'], [G1, '-'], [{ x: 300, y: 500 }, { x: 100, y: 500 }]),
        wire([K1b2, '1'], { x: 300, y: 100 }, [{ x: 560, y: 100 }]),
        wire([K1b2, '2'], [E1, '1']),
        wire([E1, '2'], { x: 300, y: 500 }, [{ x: 560, y: 500 }]),
        note(140, 160, 'S1 = STOPP', 'text', 12),
        note(140, 290, 'S2 = START', 'text', 12),
        note(430, 230, 'Selvhold', 'text', 11),
        note(100, 570, 'Hold inne S2 (START), slipp, og se at K1 holder seg selv. Trykk S1 (STOPP) for å slå av.'),
      ];
    },
  },
  {
    id: 'tidsrele',
    name: 'Tidsrelé (tiltrekksforsinket)',
    description: 'Når S1 lukkes, starter tidsreléet K1. Lampen tenner først etter innstilt tid (3 s).',
    level: 'Viderekommen',
    build: () => {
      const G1 = comp('dc-source', 100, 300, 'G1', { U: '12' });
      const S1 = comp('switch-no', 300, 200, 'S1');
      const K1 = comp('timer-on', 300, 380, 'K1', { t: '3' });
      const K1c = comp('relay-no', 520, 260, 'K1');
      const E1 = comp('lamp', 520, 380, 'E1');
      return [
        G1,
        S1,
        K1,
        K1c,
        E1,
        wire([G1, '+'], [S1, '1'], [{ x: 100, y: 120 }, { x: 300, y: 120 }]),
        wire([S1, '2'], [K1, 'A1']),
        wire([K1, 'A2'], [G1, '-'], [{ x: 300, y: 480 }, { x: 100, y: 480 }]),
        wire([K1c, '1'], { x: 300, y: 120 }, [{ x: 520, y: 120 }]),
        wire([K1c, '2'], [E1, '1']),
        wire([E1, '2'], { x: 300, y: 480 }, [{ x: 520, y: 480 }]),
        note(100, 550, 'Lukk S1 og vent. Kontakten K1 slutter etter 3 sekunder.'),
      ];
    },
  },
  {
    id: 'sikring',
    name: 'Sikring og kortslutning',
    description: 'Lukk S2 for å kortslutte lampen. Sikringen F1 løser ut. Klikk på F1 for å bytte sikring.',
    level: 'Middels',
    build: () => {
      const G1 = comp('dc-source', 150, 300, 'G1', { U: '12', Ri: '0,5' });
      const F1 = comp('fuse', 300, 150, 'F1', { In: '2' }, 90);
      const E1 = comp('lamp', 500, 300, 'E1');
      const S2 = comp('switch-no', 650, 300, 'S2');
      return [
        G1,
        F1,
        E1,
        S2,
        wire([G1, '+'], [F1, '2'], [{ x: 150, y: 150 }]),
        wire([F1, '1'], [E1, '1'], [{ x: 500, y: 150 }]),
        wire([S2, '1'], { x: 500, y: 150 }, [{ x: 650, y: 150 }]),
        wire([E1, '2'], [G1, '-'], [{ x: 500, y: 420 }, { x: 150, y: 420 }]),
        wire([S2, '2'], { x: 500, y: 420 }, [{ x: 650, y: 420 }]),
        note(150, 480, 'S2 kortslutter lampen. Uten sikring ville strømmen blitt svært stor.'),
      ];
    },
  },
];

export function exampleDoc(ex: CircuitExample): DrawingDoc {
  const d = newDoc('simulation', ex.name);
  d.elements = ex.build();
  return d;
}
