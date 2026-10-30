// Enkle 3D-møbler bygd av bokser og sylindre. Hvert møbel er sentrert i (0,0) med fronten mot +z
// og baksiden (−z) mot veggen. Bredde w langs x, dybde d langs z.
import * as THREE from 'three';

export type FurnitureType =
  | 'sofa'
  | 'lenestol'
  | 'salongbord'
  | 'tvbenk'
  | 'bokhylle'
  | 'plante'
  | 'teppe'
  | 'peis'
  | 'kjokken'
  | 'kjoleskap'
  | 'spisebord'
  | 'seng'
  | 'sykeseng'
  | 'madrass'
  | 'nattbord'
  | 'garderobe'
  | 'kommode'
  | 'pult'
  | 'skolepult'
  | 'reol'
  | 'esker'
  | 'arbeidsbenk'
  | 'benk'
  | 'skranke'
  | 'motebord'
  | 'vaskemaskin'
  | 'servant'
  | 'stekeovn'
  | 'labbenk'
  | 'serverskap'
  | 'hoyball'
  | 'skap'
  | 'frisorstol'
  | 'lekekasse';

export interface FurnitureItem {
  type: FurnitureType;
  w: number;
  d: number;
  /** true = står inntil vegg, false = står fritt i rommet */
  wall: boolean;
  /** true = kan gå over (teppe) – ingen kollisjon */
  flat?: boolean;
}

const it = (type: FurnitureType, w: number, d: number, wall = true, flat = false): FurnitureItem => ({ type, w, d, wall, flat });

/** Møbler for et rom, valgt ut fra romnavnet */
export function furnitureFor(roomName: string): FurnitureItem[] {
  const n = roomName.toLowerCase();
  const has = (...words: string[]) => words.some((w) => n.includes(w));
  if (has('peisestue')) return [it('peis', 1.4, 0.6), it('sofa', 2.0, 0.9), it('lenestol', 0.9, 0.85), it('bokhylle', 1.0, 0.35), it('salongbord', 1.0, 0.6, false), it('teppe', 2.0, 1.4, false, true), it('plante', 0.45, 0.45)];
  if (has('stue', 'dagligstue')) return [it('sofa', 2.0, 0.9), it('tvbenk', 1.6, 0.45), it('bokhylle', 1.0, 0.35), it('lenestol', 0.9, 0.85), it('salongbord', 1.0, 0.6, false), it('teppe', 2.2, 1.5, false, true), it('plante', 0.45, 0.45), it('lenestol', 0.9, 0.85)];
  if (has('kjøkken')) return [it('kjokken', 2.4, 0.62), it('kjoleskap', 0.65, 0.68), it('spisebord', 2.0, 1.7, false), it('plante', 0.45, 0.45), it('kommode', 0.9, 0.45)];
  if (has('beboerrom')) return [it('sykeseng', 1.0, 2.1), it('nattbord', 0.45, 0.42), it('lenestol', 0.85, 0.8), it('garderobe', 1.0, 0.6), it('plante', 0.4, 0.4)];
  if (has('soverom', 'sovealkove', 'gjesterom')) return [it('seng', 1.6, 2.1), it('nattbord', 0.45, 0.42), it('nattbord', 0.45, 0.42), it('garderobe', 1.2, 0.62), it('kommode', 1.0, 0.5), it('teppe', 1.6, 1.0, false, true), it('plante', 0.4, 0.4)];
  if (has('hvilerom')) return [it('madrass', 0.8, 1.6), it('madrass', 0.8, 1.6), it('madrass', 0.8, 1.6), it('teppe', 1.8, 1.2, false, true), it('kommode', 0.9, 0.45)];
  if (has('lekerom', 'barneavdeling')) return [it('lekekasse', 0.8, 0.5), it('bokhylle', 1.0, 0.35), it('teppe', 2.0, 1.6, false, true), it('spisebord', 1.6, 1.4, false), it('lekekasse', 0.8, 0.5), it('plante', 0.4, 0.4)];
  if (has('klasserom', 'grupperom')) return [it('skolepult', 1.2, 1.1, false), it('skolepult', 1.2, 1.1, false), it('skolepult', 1.2, 1.1, false), it('skolepult', 1.2, 1.1, false), it('pult', 1.4, 1.3), it('bokhylle', 1.0, 0.35)];
  if (has('lesesal', 'bibliotek')) return [it('bokhylle', 1.0, 0.35), it('bokhylle', 1.0, 0.35), it('bokhylle', 1.0, 0.35), it('motebord', 2.4, 1.9, false), it('lenestol', 0.85, 0.8), it('plante', 0.45, 0.45)];
  if (has('møterom', 'frokostsal', 'kantine')) return [it('motebord', 2.6, 1.9, false), it('kommode', 1.2, 0.5), it('plante', 0.45, 0.45), it('plante', 0.45, 0.45), it('kjoleskap', 0.65, 0.68)];
  if (has('hjemmekontor', 'kontor')) return [it('pult', 1.4, 1.3), it('bokhylle', 1.0, 0.35), it('kommode', 0.8, 0.5), it('pult', 1.4, 1.3), it('plante', 0.45, 0.45), it('lenestol', 0.85, 0.8)];
  if (has('serverrom')) return [it('serverskap', 0.65, 1.0), it('serverskap', 0.65, 1.0), it('serverskap', 0.65, 1.0), it('reol', 1.6, 0.5)];
  if (has('verksted', 'garasje')) return [it('arbeidsbenk', 1.8, 0.75), it('reol', 1.6, 0.5), it('esker', 1.0, 0.7), it('skap', 0.9, 0.55)];
  if (has('lager', 'bod', 'magasin', 'redskapsrom', 'arkiv')) return [it('reol', 1.8, 0.55), it('reol', 1.8, 0.55), it('reol', 1.8, 0.55), it('esker', 1.0, 0.7), it('esker', 1.0, 0.7)];
  if (has('høyloft', 'loft', 'fjøs', 'melkerom')) return [it('hoyball', 1.2, 0.8), it('hoyball', 1.2, 0.8), it('hoyball', 1.2, 0.8), it('esker', 1.0, 0.7), it('hoyball', 1.2, 0.8)];
  if (has('resepsjon', 'skranke')) return [it('skranke', 1.8, 0.7), it('lenestol', 0.85, 0.8), it('lenestol', 0.85, 0.8), it('salongbord', 0.8, 0.5, false), it('plante', 0.45, 0.45)];
  if (has('venterom')) return [it('lenestol', 0.85, 0.8), it('lenestol', 0.85, 0.8), it('lenestol', 0.85, 0.8), it('salongbord', 0.8, 0.5, false), it('plante', 0.45, 0.45), it('bokhylle', 1.0, 0.35)];
  if (has('gang', 'korridor', 'foajé', 'garderobe')) return [it('benk', 1.4, 0.45), it('skap', 0.9, 0.55), it('plante', 0.45, 0.45), it('benk', 1.4, 0.45), it('skap', 0.9, 0.55)];
  if (has('toalett', 'bad', 'vaskerom', 'stellerom')) return [it('servant', 0.8, 0.5), it('vaskemaskin', 0.62, 0.62), it('skap', 0.8, 0.45), it('kommode', 0.9, 0.5)];
  if (has('salong')) return [it('frisorstol', 0.8, 0.9), it('frisorstol', 0.8, 0.9), it('skranke', 1.4, 0.6), it('lenestol', 0.85, 0.8), it('plante', 0.45, 0.45)];
  if (has('butikk')) return [it('skranke', 1.6, 0.65), it('reol', 1.6, 0.5), it('reol', 1.6, 0.5), it('plante', 0.45, 0.45)];
  if (has('bakerom')) return [it('stekeovn', 1.2, 0.8), it('kjokken', 2.0, 0.65), it('reol', 1.4, 0.5), it('esker', 1.0, 0.7)];
  if (has('laboratorium')) return [it('labbenk', 2.0, 0.7), it('labbenk', 2.0, 0.7), it('skap', 0.9, 0.55), it('kjoleskap', 0.65, 0.68)];
  if (has('behandlingsrom')) return [it('frisorstol', 0.8, 0.9), it('servant', 0.8, 0.5), it('skap', 0.9, 0.55), it('kommode', 1.0, 0.5)];
  if (has('sterilrom', 'medisinrom', 'vaktrom')) return [it('skap', 0.9, 0.55), it('skap', 0.9, 0.55), it('pult', 1.4, 1.3), it('servant', 0.8, 0.5), it('kjoleskap', 0.65, 0.68)];
  if (has('hall', 'tribune')) return [it('benk', 1.8, 0.45), it('benk', 1.8, 0.45), it('benk', 1.8, 0.45), it('benk', 1.8, 0.45), it('esker', 1.0, 0.7)];
  if (has('verksted')) return [it('arbeidsbenk', 1.8, 0.75)];
  return [it('kommode', 1.0, 0.5), it('plante', 0.45, 0.45), it('lenestol', 0.85, 0.8)];
}

// ---------------------------------------------------------------------------
// Modeller
// ---------------------------------------------------------------------------
const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, opts: { rough?: number; metal?: number; emissive?: number; ei?: number } = {}) {
  const key = `${color}-${opts.rough}-${opts.metal}-${opts.emissive}-${opts.ei}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.8, metalness: opts.metal ?? 0, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 0 });
    matCache.set(key, m);
  }
  return m;
}

function box(g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

function cyl(g: THREE.Group, rt: number, rb: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

function legs(g: THREE.Group, w: number, d: number, h: number, m: THREE.Material, inset = 0.05, r = 0.025) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, r * 2, h, r * 2, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), m);
}

function table(g: THREE.Group, w: number, d: number, h: number, top: THREE.Material, leg: THREE.Material, x = 0, z = 0) {
  const t = new THREE.Group();
  box(t, w, 0.04, d, 0, h, 0, top);
  legs(t, w, d, h - 0.02, leg);
  t.position.set(x, 0, z);
  g.add(t);
}

function chair(g: THREE.Group, x: number, z: number, rotY: number, seat: THREE.Material, frame: THREE.Material) {
  const c = new THREE.Group();
  box(c, 0.42, 0.05, 0.42, 0, 0.45, 0, seat);
  box(c, 0.42, 0.42, 0.04, 0, 0.68, -0.19, seat);
  legs(c, 0.42, 0.42, 0.44, frame, 0.03, 0.015);
  c.position.set(x, 0, z);
  c.rotation.y = rotY;
  g.add(c);
}

const SOFA_COLORS = [0x475569, 0x7c2d12, 0x365314, 0x1e3a8a, 0x713f12];
const BOOK_COLORS = [0xb91c1c, 0x1d4ed8, 0x15803d, 0xa16207, 0x7e22ce, 0x0f766e, 0xe5e7eb];

/** Bygger et møbel. rnd gir litt variasjon (farger) mellom like møbler. */
export function buildFurniture(f: FurnitureItem, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const { w, d } = f;
  const wood = mat(0x8b5e34, { rough: 0.7 });
  const darkWood = mat(0x4a2f1a, { rough: 0.7 });
  const white = mat(0xf1f5f9, { rough: 0.5 });
  const grey = mat(0x94a3b8, { rough: 0.6 });
  const steel = mat(0xcbd5e1, { rough: 0.35, metal: 0.6 });
  const black = mat(0x111827, { rough: 0.5 });
  const fabric = mat(SOFA_COLORS[Math.floor(rnd() * SOFA_COLORS.length)], { rough: 0.95 });
  const back = -d / 2;

  switch (f.type) {
    case 'sofa':
    case 'lenestol': {
      box(g, w, 0.42, d, 0, 0.21, 0, fabric);
      box(g, w, 0.5, 0.2, 0, 0.62, back + 0.1, fabric);
      box(g, 0.16, 0.62, d, -w / 2 + 0.08, 0.31, 0, fabric);
      box(g, 0.16, 0.62, d, w / 2 - 0.08, 0.31, 0, fabric);
      const cushions = Math.max(1, Math.round((w - 0.3) / 0.6));
      for (let i = 0; i < cushions; i++) {
        const cw = (w - 0.34) / cushions;
        box(g, cw - 0.03, 0.1, d - 0.28, -w / 2 + 0.17 + cw * (i + 0.5), 0.47, 0.06, mat(0xe2e8f0, { rough: 1 }));
      }
      break;
    }
    case 'frisorstol': {
      const seat = mat(0x1e40af, { rough: 0.6 });
      cyl(g, 0.25, 0.3, 0.05, 0, 0.025, 0, steel);
      cyl(g, 0.05, 0.05, 0.4, 0, 0.22, 0, steel);
      box(g, 0.55, 0.12, 0.5, 0, 0.48, 0.05, seat);
      box(g, 0.55, 0.6, 0.1, 0, 0.82, -0.2, seat);
      box(g, 0.08, 0.06, 0.45, -0.31, 0.65, 0.05, black);
      box(g, 0.08, 0.06, 0.45, 0.31, 0.65, 0.05, black);
      break;
    }
    case 'salongbord':
      table(g, w, d, 0.42, darkWood, darkWood);
      break;
    case 'teppe': {
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat([0x7f1d1d, 0x1e3a8a, 0x3f6212, 0x78350f][Math.floor(rnd() * 4)], { rough: 1 }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.y = 0.025;
      g.add(rug);
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, d - 0.3), mat(0xd6c7a1, { rough: 1 }));
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.027;
      g.add(inner);
      break;
    }
    case 'tvbenk': {
      box(g, w, 0.45, d, 0, 0.225, 0, darkWood);
      const tw = w * 0.75;
      box(g, tw, 0.62, 0.05, 0, 0.45 + 0.4, back + 0.14, black);
      box(g, tw - 0.05, 0.57, 0.01, 0, 0.45 + 0.4, back + 0.17, mat(0x0f172a, { rough: 0.2, emissive: 0x1e3a8a, ei: 0.25 }));
      box(g, 0.25, 0.08, 0.18, 0, 0.49, back + 0.14, black);
      break;
    }
    case 'bokhylle':
    case 'reol': {
      const frame = f.type === 'reol' ? grey : wood;
      const h = f.type === 'reol' ? 2.0 : 1.9;
      box(g, w, h, 0.02, 0, h / 2, back + 0.01, frame);
      box(g, 0.03, h, d, -w / 2 + 0.015, h / 2, 0, frame);
      box(g, 0.03, h, d, w / 2 - 0.015, h / 2, 0, frame);
      const shelves = 5;
      for (let s = 0; s < shelves; s++) {
        const y = 0.05 + (s * (h - 0.1)) / (shelves - 1);
        box(g, w, 0.03, d, 0, y, 0, frame);
        if (s === shelves - 1) continue;
        // Innhold: bøker i bokhylle, esker i lagerreol
        let x = -w / 2 + 0.05;
        while (x < w / 2 - 0.1) {
          if (f.type === 'reol') {
            const bw = 0.3 + rnd() * 0.25;
            if (x + bw > w / 2 - 0.05) break;
            const bh = 0.2 + rnd() * 0.15;
            box(g, bw - 0.02, bh, d - 0.08, x + bw / 2, y + 0.015 + bh / 2, 0, mat(0xb08452, { rough: 1 }));
            x += bw + 0.03;
          } else {
            const bw = 0.03 + rnd() * 0.04;
            const bh = 0.2 + rnd() * 0.12;
            if (rnd() < 0.08) {
              x += 0.12;
              continue;
            }
            box(g, bw, bh, d - 0.1, x + bw / 2, y + 0.015 + bh / 2, 0.02, mat(BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], { rough: 0.9 }));
            x += bw + 0.004;
          }
        }
      }
      break;
    }
    case 'plante': {
      cyl(g, 0.17, 0.13, 0.3, 0, 0.15, 0, mat(0x9a3412, { rough: 0.9 }));
      const leaves = mat(0x166534, { rough: 0.9 });
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.16 + rnd() * 0.06, 10, 8), leaves);
        s.position.set((rnd() - 0.5) * 0.22, 0.45 + rnd() * 0.45, (rnd() - 0.5) * 0.22);
        g.add(s);
      }
      break;
    }
    case 'peis': {
      const stone = mat(0x6b7280, { rough: 1 });
      box(g, w, 1.15, d, 0, 0.575, 0, stone);
      box(g, w * 0.55, 0.55, 0.05, 0, 0.42, d / 2 - 0.02, black);
      box(g, w * 0.45, 0.18, 0.04, 0, 0.25, d / 2 - 0.0, mat(0xf97316, { emissive: 0xf97316, ei: 2.5 }));
      box(g, w + 0.1, 0.08, d + 0.08, 0, 1.19, 0.02, darkWood);
      box(g, w * 0.4, 1.4, d * 0.6, 0, 1.9, back + d * 0.3, stone);
      const glow = new THREE.PointLight(0xff8a3d, 3, 4, 1.5);
      glow.position.set(0, 0.5, d / 2 + 0.3);
      g.add(glow);
      break;
    }
    case 'kjokken':
    case 'labbenk': {
      const front = f.type === 'labbenk' ? grey : white;
      const top = f.type === 'labbenk' ? black : mat(0x3f3f46, { rough: 0.4 });
      box(g, w, 0.86, d - 0.04, 0, 0.43, -0.02, front);
      box(g, w, 0.04, d, 0, 0.88, 0, top);
      const doors = Math.max(1, Math.round(w / 0.6));
      for (let i = 1; i < doors; i++) box(g, 0.01, 0.8, 0.01, -w / 2 + (w / doors) * i, 0.43, d / 2 - 0.035, grey);
      if (f.type === 'kjokken') {
        box(g, 0.5, 0.02, 0.38, w * 0.15, 0.905, 0.02, steel);
        cyl(g, 0.012, 0.012, 0.25, w * 0.15, 1.02, back + 0.08, steel, 8);
        box(g, 0.55, 0.02, 0.5, -w * 0.28, 0.905, 0, black);
        // Overskap
        box(g, w, 0.7, 0.34, 0, 1.85, back + 0.17, front);
      } else {
        for (let i = 0; i < 4; i++) cyl(g, 0.035, 0.05, 0.16, -w / 3 + i * 0.25, 0.98, 0, mat([0x38bdf8, 0x22c55e, 0xf472b6, 0xfacc15][i], { rough: 0.2 }), 10);
      }
      break;
    }
    case 'kjoleskap':
      box(g, w, 1.8, d, 0, 0.9, 0, white);
      box(g, w - 0.02, 0.01, 0.01, 0, 1.15, d / 2, grey);
      box(g, 0.03, 0.35, 0.03, w / 2 - 0.08, 1.35, d / 2 + 0.015, steel);
      box(g, 0.03, 0.3, 0.03, w / 2 - 0.08, 0.85, d / 2 + 0.015, steel);
      break;
    case 'stekeovn':
      box(g, w, 1.5, d, 0, 0.75, 0, steel);
      for (const y of [0.45, 1.05]) {
        box(g, w - 0.15, 0.4, 0.02, 0, y, d / 2, black);
        box(g, w - 0.3, 0.04, 0.03, 0, y + 0.24, d / 2 + 0.02, steel);
      }
      break;
    case 'spisebord':
    case 'motebord': {
      const tw = w - 0.9;
      const td = d - 0.8;
      table(g, tw, td, 0.74, f.type === 'motebord' ? mat(0xe5e7eb, { rough: 0.4 }) : wood, f.type === 'motebord' ? steel : darkWood);
      const seat = f.type === 'motebord' ? mat(0x334155) : wood;
      const per = Math.max(1, Math.floor(tw / 0.6));
      for (let i = 0; i < per; i++) {
        const x = -tw / 2 + (tw / per) * (i + 0.5);
        chair(g, x, -td / 2 - 0.28, 0, seat, black);
        chair(g, x, td / 2 + 0.28, Math.PI, seat, black);
      }
      chair(g, -tw / 2 - 0.3, 0, Math.PI / 2, seat, black);
      chair(g, tw / 2 + 0.3, 0, -Math.PI / 2, seat, black);
      break;
    }
    case 'seng':
    case 'sykeseng':
    case 'madrass': {
      const frame = f.type === 'sykeseng' ? white : wood;
      if (f.type !== 'madrass') {
        box(g, w, 0.3, d, 0, 0.2, 0, frame);
        box(g, w, 0.9, 0.08, 0, 0.45, back + 0.04, frame);
      }
      const my = f.type === 'madrass' ? 0.08 : 0.42;
      box(g, w - 0.06, f.type === 'madrass' ? 0.16 : 0.2, d - 0.12, 0, my, 0.03, white);
      box(g, w - 0.04, 0.09, d * 0.62, 0, my + 0.12, d * 0.17, mat([0x2563eb, 0xdb2777, 0x16a34a, 0xca8a04][Math.floor(rnd() * 4)], { rough: 1 }));
      const pillows = w > 1.2 ? 2 : 1;
      for (let i = 0; i < pillows; i++) box(g, w / pillows - 0.12, 0.12, 0.38, -w / 2 + (w / pillows) * (i + 0.5), my + 0.14, back + 0.32, white);
      if (f.type === 'sykeseng') {
        box(g, 0.03, 0.25, d * 0.5, -w / 2, 0.65, 0.1, steel);
        box(g, 0.03, 0.25, d * 0.5, w / 2, 0.65, 0.1, steel);
      }
      break;
    }
    case 'nattbord':
      box(g, w, 0.52, d, 0, 0.26, 0, wood);
      box(g, w - 0.06, 0.01, 0.01, 0, 0.36, d / 2, darkWood);
      cyl(g, 0.06, 0.08, 0.04, 0, 0.54, 0, black, 12);
      cyl(g, 0.01, 0.01, 0.25, 0, 0.66, 0, black, 6);
      cyl(g, 0.08, 0.12, 0.14, 0, 0.82, 0, mat(0xfef3c7, { emissive: 0xffd58a, ei: 0.4 }), 14);
      break;
    case 'garderobe':
    case 'skap': {
      const h = f.type === 'garderobe' ? 2.0 : 1.9;
      const m = f.type === 'skap' ? mat(0xd1d5db, { rough: 0.5, metal: 0.2 }) : white;
      box(g, w, h, d, 0, h / 2, 0, m);
      box(g, 0.01, h - 0.1, 0.01, 0, h / 2, d / 2, grey);
      box(g, 0.02, 0.2, 0.03, -0.05, h / 2, d / 2 + 0.015, steel);
      box(g, 0.02, 0.2, 0.03, 0.05, h / 2, d / 2 + 0.015, steel);
      break;
    }
    case 'kommode':
    case 'servant': {
      const m = f.type === 'servant' ? white : wood;
      box(g, w, 0.85, d, 0, 0.425, 0, m);
      if (f.type === 'servant') {
        box(g, w * 0.6, 0.06, d * 0.6, 0, 0.88, 0.02, white);
        cyl(g, 0.012, 0.012, 0.18, 0, 0.98, back + 0.08, steel, 8);
        box(g, w * 0.8, 0.7, 0.02, 0, 1.55, back + 0.01, mat(0xdbeafe, { rough: 0.05, metal: 0.8 }));
      } else {
        for (let i = 0; i < 3; i++) box(g, w - 0.06, 0.01, 0.01, 0, 0.25 + i * 0.25, d / 2, darkWood);
      }
      break;
    }
    case 'pult': {
      const dw = 0.75;
      const dz = back + dw / 2;
      table(g, w, dw, 0.74, wood, black, 0, dz);
      box(g, 0.55, 0.34, 0.03, 0, 0.98, back + 0.12, black);
      box(g, 0.52, 0.31, 0.01, 0, 0.98, back + 0.14, mat(0x0f172a, { emissive: 0x38bdf8, ei: 0.3 }));
      box(g, 0.06, 0.12, 0.06, 0, 0.8, back + 0.12, black);
      box(g, 0.42, 0.02, 0.14, 0, 0.77, dz + 0.1, grey);
      // Kontorstol
      const st = new THREE.Group();
      cyl(st, 0.25, 0.28, 0.05, 0, 0.03, 0, black);
      cyl(st, 0.03, 0.03, 0.4, 0, 0.25, 0, steel, 8);
      box(st, 0.48, 0.08, 0.46, 0, 0.48, 0, mat(0x1f2937));
      box(st, 0.46, 0.5, 0.06, 0, 0.78, 0.22, mat(0x1f2937));
      st.position.set(0, 0, back + dw + 0.32);
      g.add(st);
      break;
    }
    case 'skolepult': {
      const dw = 0.5;
      table(g, w, dw, 0.72, mat(0xd4b483, { rough: 0.6 }), grey, 0, back + dw / 2);
      chair(g, -w / 4, back + dw + 0.3, Math.PI, mat(0x2563eb), grey);
      chair(g, w / 4, back + dw + 0.3, Math.PI, mat(0x2563eb), grey);
      break;
    }
    case 'esker': {
      const cardboard = mat(0xb08452, { rough: 1 });
      box(g, 0.5, 0.4, 0.45, -0.22, 0.2, -0.08, cardboard);
      box(g, 0.45, 0.35, 0.4, 0.25, 0.175, 0.05, cardboard);
      box(g, 0.4, 0.3, 0.38, -0.15, 0.55, -0.05, cardboard);
      break;
    }
    case 'lekekasse': {
      box(g, w, 0.45, d, 0, 0.225, 0, mat(0xfacc15, { rough: 0.6 }));
      const toys = [0xef4444, 0x3b82f6, 0x22c55e];
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(toys[i], { rough: 0.4 }));
        b.position.set(-0.2 + i * 0.2, 0.5, 0);
        g.add(b);
      }
      break;
    }
    case 'arbeidsbenk': {
      box(g, w, 0.06, d, 0, 0.9, 0, mat(0xa16207, { rough: 0.8 }));
      legs(g, w, d, 0.87, grey, 0.06, 0.03);
      box(g, w - 0.1, 0.04, d - 0.1, 0, 0.25, 0, grey);
      box(g, w, 0.8, 0.03, 0, 1.45, back + 0.015, mat(0xd6c7a1, { rough: 1 }));
      for (let i = 0; i < 6; i++) box(g, 0.04, 0.2 + rnd() * 0.2, 0.03, -w / 2 + 0.2 + i * (w - 0.4) / 5, 1.45, back + 0.05, [black, steel, mat(0xdc2626)][i % 3]);
      box(g, 0.4, 0.18, 0.22, w / 2 - 0.35, 1.0, 0, mat(0xdc2626, { rough: 0.5 }));
      break;
    }
    case 'benk': {
      box(g, w, 0.05, 0.38, 0, 0.45, 0.02, wood);
      legs(g, w, 0.38, 0.43, black, 0.08, 0.02);
      box(g, w, 0.05, 0.04, 0, 1.7, back + 0.02, wood);
      for (let i = 0; i < 4; i++) box(g, 0.02, 0.02, 0.12, -w / 2 + 0.2 + i * (w - 0.4) / 3, 1.62, back + 0.08, steel);
      break;
    }
    case 'skranke': {
      box(g, w, 1.05, d, 0, 0.525, 0, mat(0x1e3a8a, { rough: 0.5 }));
      box(g, w + 0.06, 0.04, d + 0.1, 0, 1.07, 0.03, mat(0xe5e7eb, { rough: 0.3 }));
      box(g, 0.45, 0.3, 0.03, 0, 1.25, back + 0.15, black);
      break;
    }
    case 'vaskemaskin': {
      box(g, w, 0.85, d, 0, 0.425, 0, white);
      cyl(g, 0.2, 0.2, 0.02, 0, 0.45, d / 2, black, 24).rotation.x = Math.PI / 2;
      cyl(g, 0.15, 0.15, 0.025, 0, 0.45, d / 2 + 0.005, mat(0x93c5fd, { rough: 0.1 }), 24).rotation.x = Math.PI / 2;
      box(g, w - 0.04, 0.08, 0.01, 0, 0.79, d / 2, grey);
      break;
    }
    case 'serverskap': {
      box(g, w, 2.0, d, 0, 1.0, 0, mat(0x111827, { rough: 0.4, metal: 0.3 }));
      for (let i = 0; i < 10; i++) {
        box(g, w - 0.1, 0.12, 0.01, 0, 0.3 + i * 0.16, d / 2, mat(0x1f2937));
        box(g, 0.02, 0.02, 0.01, w / 2 - 0.1, 0.3 + i * 0.16, d / 2 + 0.005, mat(0x22c55e, { emissive: 0x22c55e, ei: 2 }));
      }
      break;
    }
    case 'hoyball': {
      box(g, w, 0.8, d, 0, 0.4, 0, mat(0xd9b648, { rough: 1 }));
      for (const x of [-w / 4, w / 4]) box(g, 0.02, 0.82, d + 0.02, x, 0.4, 0, mat(0x92400e));
      break;
    }
  }
  return g;
}
