// Kretser og plantegninger som brukes i Story Mode-oppdrag.
import type { ComponentEl, DrawingDoc, Element, WallEl, WireEl } from '../../types';
import { EXAMPLES, comp, wire, note } from '../../sim/examples';
import { newDoc } from '../../store/factories';
import { uid } from '../../utils/id';

const ex = (id: string) => EXAMPLES.find((e) => e.id === id)!.build();

/** Kretser for feilsøking. Kalles på nytt hver gang, så hver visning får nye id-er. */
export const CIRCUITS: Record<string, { name: string; build: () => Element[] }> = {
  enkel: { name: 'Lampe med bryter (12 V)', build: () => ex('enkel').filter((e) => e.type !== 'text') },
  serie: { name: 'To lamper i serie (12 V)', build: () => ex('serie').filter((e) => e.type !== 'text') },
  parallell: { name: 'To lamper i parallell (12 V)', build: () => ex('parallell').filter((e) => e.type !== 'text') },
  trapp: { name: 'Trappekobling (12 V)', build: () => ex('trapp').filter((e) => e.type !== 'text') },
  selvhold: { name: 'Selvholdekrets med relé (12 V)', build: () => ex('selvhold').filter((e) => e.type !== 'text') },
  ringeklokke: {
    name: 'Ringeklokke med trykknapp (12 V)',
    build: () => {
      const G1 = comp('dc-source', 200, 300, 'G1', { U: '12' });
      const S1 = comp('pushbutton-no', 400, 200, 'S1', {}, 90);
      const P1 = comp('bell', 600, 320, 'P1', { U: '12', P: '3' });
      return [
        G1,
        S1,
        P1,
        wire([G1, '+'], [S1, '2'], [{ x: 200, y: 200 }]),
        wire([S1, '1'], [P1, '1'], [{ x: 590, y: 200 }]),
        wire([P1, '2'], [G1, '-'], [{ x: 610, y: 400 }, { x: 200, y: 400 }]),
      ];
    },
  },
};

/** Finner komponenten en feil skal legges på (første med gitt betegnelse, helst en spole hvis flere) */
export function findByLabel(elements: Element[], label: string, symbol?: string): ComponentEl | undefined {
  const list = elements.filter((e): e is ComponentEl => e.type === 'component' && e.label === label && (!symbol || e.symbolId === symbol));
  return list.find((c) => /coil|timer/.test(c.symbolId)) ?? list[0];
}

// ---------------------------------------------------------------------------
// Plantegninger til materiallister (1 enhet = 1 cm)
// ---------------------------------------------------------------------------
function room(x: number, z: number, w: number, d: number, name: string): Element[] {
  const wall: WallEl = {
    id: uid('wall'),
    type: 'wall',
    points: [
      { x, y: z },
      { x: x + w, y: z },
      { x: x + w, y: z + d },
      { x, y: z + d },
    ],
    thickness: 15,
    closed: true,
  };
  return [wall, { id: uid('room'), type: 'rect', x, y: z, w, h: d, lineStyle: 'solid', roomName: name }];
}

function cable(points: [number, number][], spec: string): WireEl {
  return {
    id: uid('w'),
    type: 'wire',
    kind: 'cable',
    points: points.map(([x, y]) => ({ x, y })),
    lineStyle: 'dashed',
    width: 2,
    color: '#f97316',
    wireNo: spec,
  };
}

export const PLANS: Record<string, { name: string; build: () => DrawingDoc }> = {
  leilighet: {
    name: 'Leilighet – stue og soverom',
    build: () => {
      const d = newDoc('floorplan', 'Plan: leilighet');
      d.sheet.show = false;
      d.elements = [
        ...room(0, 0, 500, 400, 'Stue'),
        ...room(500, 0, 350, 400, 'Soverom'),
        comp('plan-lamp', 170, 200, ''),
        comp('plan-lamp', 330, 200, ''),
        comp('plan-lamp', 675, 200, ''),
        comp('plan-switch', 40, 360, '', {}, 0),
        comp('plan-switch', 540, 360, '', {}, 0),
        comp('plan-socket', 120, 20, '', {}, 180),
        comp('plan-socket', 380, 20, '', {}, 180),
        comp('plan-socket', 480, 200, '', {}, 90),
        comp('plan-socket', 600, 20, '', {}, 180),
        comp('plan-socket', 830, 200, '', {}, 270),
        comp('plan-junction-box', 250, 30, ''),
        comp('plan-junction-box', 680, 30, ''),
        comp('plan-panel', 80, 380, '', { navn: 'Fordeling' }),
        cable(
          [
            [80, 370],
            [80, 30],
            [250, 30],
          ],
          'W1 PFXP 3G1,5',
        ),
        cable(
          [
            [250, 30],
            [680, 30],
          ],
          'W2 PFXP 3G1,5',
        ),
        cable(
          [
            [100, 370],
            [100, 60],
            [480, 60],
            [480, 200],
          ],
          'W3 PFXP 3G2,5',
        ),
        note(20, 450, 'Kabelruter er stiplet oransje. Mål er i plantegningens målestokk (1 rute = 10 cm).'),
      ];
      return d;
    },
  },
  enebolig: {
    name: 'Enebolig – tre rom',
    build: () => {
      const d = newDoc('floorplan', 'Plan: enebolig');
      d.sheet.show = false;
      d.elements = [
        ...room(0, 0, 500, 450, 'Stue'),
        ...room(500, 0, 400, 450, 'Kjøkken'),
        ...room(0, 450, 450, 350, 'Soverom'),
        comp('plan-lamp', 250, 225, ''),
        comp('plan-lamp', 700, 225, ''),
        comp('plan-lamp', 225, 625, ''),
        comp('plan-downlight', 620, 120, ''),
        comp('plan-downlight', 780, 120, ''),
        comp('plan-switch', 40, 410, ''),
        comp('plan-switch', 540, 410, ''),
        comp('plan-switch', 40, 770, ''),
        comp('plan-socket', 150, 20, '', {}, 180),
        comp('plan-socket', 350, 20, '', {}, 180),
        comp('plan-socket', 600, 430, ''),
        comp('plan-socket', 760, 430, ''),
        comp('plan-socket', 880, 250, '', {}, 270),
        comp('plan-socket', 100, 470, '', {}, 180),
        comp('plan-socket', 430, 620, '', {}, 270),
        comp('plan-junction-box', 250, 30, ''),
        comp('plan-junction-box', 700, 30, ''),
        comp('plan-junction-box', 225, 480, ''),
        comp('plan-panel', 460, 420, '', { navn: 'Fordeling' }),
        cable(
          [
            [460, 410],
            [460, 30],
            [250, 30],
          ],
          'W1 PFXP 3G1,5',
        ),
        cable(
          [
            [470, 410],
            [470, 30],
            [700, 30],
          ],
          'W2 PFXP 3G1,5',
        ),
        cable(
          [
            [450, 440],
            [450, 480],
            [225, 480],
          ],
          'W3 PFXP 3G1,5',
        ),
        cable(
          [
            [480, 430],
            [880, 430],
          ],
          'W4 PFXP 3G2,5',
        ),
      ];
      return d;
    },
  },
};
