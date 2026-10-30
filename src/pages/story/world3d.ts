// 3D-verden for Story Mode: en liten by med et bygg for hvert sted på kartet.
// Man går rundt i førsteperson, går inn i byggene og snakker med folk for å få scener og oppdrag.
// Selve dialogene og oppdragene vises av React oppå 3D-visningen.
import * as THREE from 'three';
import { buildFurniture, type FurnitureItem, type FurnitureType } from '../game/furniture';

const EYE = 1.65;
const RADIUS = 0.25;
/** Innendørsrommene ligger langt unna byen i samme scene */
const IN_Z = 500;
const ROOM_W = 16;
const ROOM_D = 11;

export interface Place3D {
  id: string;
  name: string;
  icon: string;
  open: boolean;
  /** Hvorfor stedet er stengt */
  lockText?: string;
  news: boolean;
}

export interface Npc3D {
  id: string;
  name: string;
  role: string;
  color: string;
  /** '!' = har noe nytt, '' = ingenting nytt */
  mark: '!' | '';
}

export type Target3D =
  | { kind: 'npc'; id: string }
  | { kind: 'door'; place: string }
  | { kind: 'exit' }
  | { kind: 'board' }
  | { kind: 'shop' }
  | { kind: 'bed' };

export interface WorldCallbacks {
  onPrompt: (text: string | null) => void;
  onInteract: (t: Target3D) => void;
  /** Spilleren gikk inn i et bygg (id) eller ut i byen (null) */
  onEnter: (place: string | null) => void;
  onActiveChange: (active: boolean) => void;
  onControlMode: (mode: 'locked' | 'drag') => void;
}

interface Collider {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

interface Interactable {
  x: number;
  z: number;
  r: number;
  target: Target3D;
  label: string;
}

/** Bygg i byen: plassering og utseende */
const BUILDINGS: Record<string, { x: number; side: 1 | -1; w: number; h: number; color: number; roof: number; style: 'hus' | 'skole' | 'verksted' | 'butikk' | 'lager' | 'kontor' | 'bygg' | 'prove' }> = {
  hjem: { x: -34, side: -1, w: 9, h: 5, color: 0x9a3b2e, roof: 0x3f1d17, style: 'hus' },
  skole: { x: -18, side: -1, w: 14, h: 8, color: 0xc9a36b, roof: 0x5b4636, style: 'skole' },
  verksted: { x: 0, side: -1, w: 13, h: 6.5, color: 0x6b7280, roof: 0x374151, style: 'verksted' },
  butikk: { x: 16, side: -1, w: 10, h: 5, color: 0x2563eb, roof: 0x1e3a8a, style: 'butikk' },
  grossist: { x: 32, side: -1, w: 13, h: 7, color: 0x166534, roof: 0x14532d, style: 'lager' },
  bedrift: { x: -24, side: 1, w: 12, h: 9, color: 0x1e3a5f, roof: 0x0f172a, style: 'kontor' },
  byggeplass: { x: -6, side: 1, w: 13, h: 7, color: 0xb45309, roof: 0x78350f, style: 'bygg' },
  kunder: { x: 10, side: 1, w: 10, h: 5.5, color: 0xe5e7eb, roof: 0x334155, style: 'hus' },
  provested: { x: 27, side: 1, w: 12, h: 7, color: 0x475569, roof: 0x1e293b, style: 'prove' },
};
const STREET_HALF = 11;
const B_DEPTH = 9;

function mat(color: number, opts: { rough?: number; metal?: number; emissive?: number; transparent?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.8,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? 0x000000,
    transparent: opts.transparent !== undefined,
    opacity: opts.transparent ?? 1,
  });
}

function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function textTexture(lines: string[], opts: { w?: number; h?: number; bg?: string; fg?: string; size?: number } = {}) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  if (opts.bg !== 'transparent') {
    g.fillStyle = opts.bg ?? '#0f172a';
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = opts.fg ?? '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = opts.size ?? 44;
  lines.forEach((l, i) => {
    g.font = `${i === 0 ? 700 : 500} ${i === 0 ? size : size * 0.62}px Inter, Segoe UI, Arial, sans-serif`;
    g.fillText(l, w / 2, (h / (lines.length + 1)) * (i + 1));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function sprite(lines: string[], width: number, opts: Parameters<typeof textTexture>[1] = {}) {
  const tex = textTexture(lines, opts);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }));
  const ratio = (opts.h ?? 128) / (opts.w ?? 512);
  s.scale.set(width, width * ratio, 1);
  return s;
}

/** Enkel figur av en person */
function buildPerson(color: string, seed: number) {
  const g = new THREE.Group();
  const skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
  const hairTones = [0x2b1b0e, 0x6b4423, 0xd6b370, 0x111111, 0x9ca3af];
  const skin = mat(skinTones[seed % skinTones.length]);
  const hair = mat(hairTones[(seed * 7) % hairTones.length]);
  const shirt = mat(new THREE.Color(color).getHex(), { rough: 0.9 });
  const pants = mat(0x1f2937);
  box(g, 0.17, 0.85, 0.2, -0.11, 0.43, 0, pants);
  box(g, 0.17, 0.85, 0.2, 0.11, 0.43, 0, pants);
  box(g, 0.5, 0.62, 0.28, 0, 1.17, 0, shirt);
  box(g, 0.12, 0.58, 0.14, -0.32, 1.17, 0, shirt);
  box(g, 0.12, 0.58, 0.14, 0.32, 1.17, 0, shirt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin);
  head.position.set(0, 1.66, 0);
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
  cap.position.set(0, 1.69, -0.01);
  g.add(cap);
  // Øyne på forsiden (+z)
  const eye = mat(0x111111);
  box(g, 0.035, 0.035, 0.02, -0.06, 1.68, 0.16, eye);
  box(g, 0.035, 0.035, 0.02, 0.06, 1.68, 0.16, eye);
  return g;
}

type Placed = { type: FurnitureType; x: number; z: number; rot?: number; w: number; d: number; flat?: boolean };

/** Møblering av innendørsrommene. Rommet går fra x −8..8 og z −5,5..5,5 (utgangen er i sør, +z). */
function interiorLayout(place: string): { items: Placed[]; spots: [number, number][]; board: string[]; objects: { kind: 'shop' | 'bed'; x: number; z: number; label: string }[] } {
  const N = -ROOM_D / 2;
  const W = -ROOM_W / 2;
  const E = ROOM_W / 2;
  const desks = (rows: number[], cols: number[]): Placed[] => rows.flatMap((z) => cols.map((x) => ({ type: 'skolepult' as FurnitureType, x, z, rot: Math.PI, w: 1.2, d: 0.6 })));
  switch (place) {
    case 'skole':
      return {
        items: [{ type: 'pult', x: 3, z: N + 1.6, w: 1.6, d: 0.8 }, ...desks([-0.6, 1.2, 3], [-4, -1.5, 1, 3.5]), { type: 'bokhylle', x: E - 0.2, z: -1, rot: -Math.PI / 2, w: 1.6, d: 0.35 }, { type: 'plante', x: W + 0.5, z: N + 0.5, w: 0.5, d: 0.5 }],
        spots: [[0, N + 1.6], [-5.6, 2.2], [5.6, 2.8], [-5.6, -1.8], [5.8, -3.2]],
        board: ['ELEKTRO VG1/VG2', 'Sikkerhet først – så fart!'],
        objects: [],
      };
    case 'verksted':
      return {
        items: [
          { type: 'arbeidsbenk', x: -5, z: N + 0.4, w: 2.4, d: 0.75 },
          { type: 'arbeidsbenk', x: 5, z: N + 0.4, w: 2.4, d: 0.75 },
          { type: 'labbenk', x: -2.5, z: 0.5, w: 2.4, d: 0.8, rot: Math.PI },
          { type: 'labbenk', x: 2.5, z: 0.5, w: 2.4, d: 0.8, rot: Math.PI },
          { type: 'skap', x: E - 0.35, z: -2, rot: -Math.PI / 2, w: 1.2, d: 0.6 },
          { type: 'reol', x: W + 0.25, z: -2.5, rot: Math.PI / 2, w: 1.6, d: 0.45 },
        ],
        spots: [[0, N + 1.4], [-4.8, 2.6], [4.8, 2.6], [0, 2.6], [6, 0.8]],
        board: ['SKOLEVERKSTEDET', 'Bare lav spenning – spør læreren før du kobler'],
        objects: [],
      };
    case 'hjem':
      return {
        items: [
          { type: 'seng', x: -5.5, z: N + 1.1, w: 1.4, d: 2.1 },
          { type: 'nattbord', x: -4.3, z: N + 0.25, w: 0.45, d: 0.42 },
          { type: 'pult', x: 2, z: N + 0.4, w: 1.4, d: 0.7 },
          { type: 'garderobe', x: E - 0.35, z: -1.5, rot: -Math.PI / 2, w: 1.2, d: 0.6 },
          { type: 'sofa', x: 3, z: 3.6, rot: Math.PI, w: 2, d: 0.9 },
          { type: 'teppe', x: 0, z: 0.5, w: 2.6, d: 1.8, flat: true },
          { type: 'plante', x: W + 0.4, z: 3.8, w: 0.45, d: 0.45 },
        ],
        spots: [[0, -1]],
        board: ['HYBELEN', 'Hjem, søte hjem'],
        objects: [
          { kind: 'bed', x: -5.5, z: N + 1.2, label: 'Karrieren din og «Avslutt dagen»' },
          { kind: 'bed', x: 2, z: N + 0.5, label: 'Karrieren din og «Avslutt dagen»' },
        ],
      };
    case 'butikk':
      return {
        items: [
          { type: 'reol', x: -4, z: -1, w: 3, d: 0.5 },
          { type: 'reol', x: -4, z: 1.5, w: 3, d: 0.5 },
          { type: 'reol', x: W + 0.25, z: -1, rot: Math.PI / 2, w: 3, d: 0.5 },
          { type: 'skranke', x: 4, z: N + 1.4, w: 2.4, d: 0.7, rot: Math.PI },
          { type: 'reol', x: 4, z: N + 0.25, w: 3, d: 0.45 },
        ],
        spots: [[4, N + 0.9], [-1, 3]],
        board: ['VERKTØYBUTIKKEN', 'Kvalitetsverktøy for fagfolk'],
        objects: [{ kind: 'shop', x: 4, z: N + 1.6, label: 'Handle verktøy og utstyr' }],
      };
    case 'grossist':
      return {
        items: [
          { type: 'reol', x: -5, z: N + 0.3, w: 3.5, d: 0.6 },
          { type: 'reol', x: 0, z: N + 0.3, w: 3.5, d: 0.6 },
          { type: 'reol', x: -3, z: 0, w: 4, d: 0.6 },
          { type: 'esker', x: 3.5, z: 0.5, w: 1.6, d: 1.2 },
          { type: 'esker', x: -6.5, z: 3.5, w: 1.2, d: 1 },
          { type: 'skranke', x: 5, z: N + 1.6, w: 2.4, d: 0.7, rot: Math.PI },
        ],
        spots: [[5, N + 1], [1, 2.8], [-1, 3.6]],
        board: ['ELEKTROGROSSISTEN', 'Lager · plukk · utkjøring'],
        objects: [],
      };
    case 'bedrift':
      return {
        items: [
          { type: 'pult', x: -5, z: N + 0.4, w: 1.6, d: 0.8 },
          { type: 'pult', x: -1.5, z: N + 0.4, w: 1.6, d: 0.8 },
          { type: 'motebord', x: 3.5, z: 0, w: 2.6, d: 1.3 },
          { type: 'skap', x: E - 0.35, z: -3, rot: -Math.PI / 2, w: 1.2, d: 0.6 },
          { type: 'reol', x: W + 0.25, z: 0, rot: Math.PI / 2, w: 2.4, d: 0.5 },
          { type: 'plante', x: 6.5, z: 4, w: 0.5, d: 0.5 },
        ],
        spots: [[-5, N + 1.3], [3.5, -1.3], [1, 2.5], [-3, 2.5], [5.6, 2.5]],
        board: ['ELEKTROBEDRIFTEN', 'Kunden først – sikkerhet alltid'],
        objects: [],
      };
    case 'byggeplass':
      return {
        items: [
          { type: 'esker', x: -5, z: N + 0.7, w: 1.6, d: 1.2 },
          { type: 'benk', x: 0, z: N + 0.4, w: 2.4, d: 0.6 },
          { type: 'arbeidsbenk', x: 5, z: N + 0.4, w: 2.4, d: 0.75 },
          { type: 'esker', x: 5.5, z: 2.5, w: 1.4, d: 1 },
        ],
        spots: [[0, N + 1.3], [-3.5, 1.5], [3, 1.8], [-6, 3]],
        board: ['BYGGEPLASSEN', 'Hjelm og vernesko påbudt'],
        objects: [],
      };
    case 'kunder':
      return {
        items: [
          { type: 'sofa', x: -3, z: N + 0.5, w: 2.2, d: 0.9 },
          { type: 'salongbord', x: -3, z: -2.2, w: 1.1, d: 0.6 },
          { type: 'teppe', x: -3, z: -2, w: 2.6, d: 1.8, flat: true },
          { type: 'kjokken', x: 4.5, z: N + 0.31, w: 3, d: 0.62 },
          { type: 'spisebord', x: 4.5, z: 0.6, w: 2, d: 1.6 },
          { type: 'plante', x: W + 0.4, z: 3.8, w: 0.45, d: 0.45 },
        ],
        spots: [[-0.5, -2.5], [2, 2.5], [-5.5, 1.2], [6.5, 3]],
        board: ['KUNDEBESØK', 'Husk: tørk av skoene!'],
        objects: [],
      };
    case 'provested':
    default:
      return {
        items: [{ type: 'pult', x: 0, z: N + 0.4, w: 2.4, d: 0.8 }, ...desks([1, 3], [-3, 3]), { type: 'labbenk', x: -5, z: -1.5, rot: Math.PI / 2, w: 2.4, d: 0.8 }],
        spots: [[0, N + 1.3], [5.5, 1]],
        board: ['PRØVESTEDET', 'Fagprøven i spillet'],
        objects: [],
      };
  }
}

export class StoryWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private outdoor = new THREE.Group();
  private indoor = new THREE.Group();
  private outColliders: Collider[] = [];
  private inColliders: Collider[] = [];
  private outTargets: Interactable[] = [];
  private inTargets: Interactable[] = [];
  private npcTargets: Interactable[] = [];
  private npcGroup = new THREE.Group();
  private markers: { obj: THREE.Object3D; base: number }[] = [];
  private placeMarkers = new Map<string, { news: THREE.Sprite; lock: THREE.Sprite; barrier: THREE.Mesh }>();
  private places: Place3D[] = [];
  private npcs: Npc3D[] = [];
  private inside: string | null = null;
  private pos = new THREE.Vector3(0, EYE, 4);
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private locked = false;
  private fallback = false;
  private paused = true;
  private drag: { x: number; y: number } | null = null;
  private touchMove = { f: 0, turn: 0 };
  private current: Interactable | null = null;
  private raf = 0;
  private disposed = false;

  constructor(
    private container: HTMLElement,
    private cb: WorldCallbacks,
    places: Place3D[],
    start: string | null,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
    this.scene.background = new THREE.Color(0x9cc9f5);
    this.scene.fog = new THREE.Fog(0x9cc9f5, 60, 140);
    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x4b5320, 1.1));
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
    sun.position.set(30, 50, 20);
    this.scene.add(sun);
    this.scene.add(this.outdoor, this.indoor);
    this.indoor.add(this.npcGroup);
    this.places = places;
    this.buildTown();
    this.setPlaces(places);
    if (start && BUILDINGS[start] && places.find((p) => p.id === start)?.open) this.enter(start, false);
    else this.placeOutside(start);

    const el = this.renderer.domElement;
    el.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('pointerlockerror', this.onLockError);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.loop();
  }

  // ------------------------------------------------------------------
  // Byen
  // ------------------------------------------------------------------
  private buildTown() {
    const o = this.outdoor;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(220, 160), mat(0x4d7c3a, { rough: 1 }));
    grass.rotation.x = -Math.PI / 2;
    o.add(grass);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(96, 9), mat(0x374151, { rough: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    o.add(road);
    for (let x = -44; x < 46; x += 5) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.18), mat(0xf8fafc));
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, 0);
      o.add(line);
    }
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(96, 6.5), mat(0x9ca3af, { rough: 0.9 }));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(0, 0.015, side * 7.75);
      o.add(walk);
    }
    // Trær og gatelys
    const trunk = mat(0x5b3a1e);
    const leaves = mat(0x2f6b2a);
    const tree = (x: number, z: number) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 8), trunk);
      t.position.set(x, 1, z);
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 10), leaves);
      c.position.set(x, 3.2, z);
      o.add(t, c);
      this.outColliders.push({ x1: x - 0.3, z1: z - 0.3, x2: x + 0.3, z2: z + 0.3 });
    };
    const pole = mat(0x334155, { metal: 0.4, rough: 0.5 });
    const bulb = mat(0xfff7cc, { emissive: 0xffe9a0 });
    for (let x = -40; x <= 40; x += 16) {
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 8), pole);
        p.position.set(x + 8, 2.1, side * 5.2);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), bulb);
        b.position.set(x + 8, 4.25, side * 5.2);
        o.add(p, b);
      }
    }
    [-44, -26, -9, 8, 22, 40].forEach((x, i) => tree(x, i % 2 ? 9.6 : -9.6));
    for (let i = 0; i < 18; i++) tree(-50 + i * 6, -30 - (i % 3) * 3);
    for (let i = 0; i < 18; i++) tree(-50 + i * 6, 30 + (i % 3) * 3);

    // Byggene
    for (const [id, b] of Object.entries(BUILDINGS)) this.buildBuilding(id, b);

    // Byen er avgrenset
    const B = { x: 46, z: 24 };
    this.outColliders.push(
      { x1: -B.x - 1, z1: -B.z - 1, x2: B.x + 1, z2: -B.z },
      { x1: -B.x - 1, z1: B.z, x2: B.x + 1, z2: B.z + 1 },
      { x1: -B.x - 1, z1: -B.z, x2: -B.x, z2: B.z },
      { x1: B.x, z1: -B.z, x2: B.x + 1, z2: B.z },
    );
    // Velkomstskilt
    const welcome = sprite(['Elektrobyen', 'Gå bort til en dør og trykk E'], 7, { bg: 'rgba(15,23,42,0.85)' });
    welcome.position.set(0, 3.2, 0);
    o.add(welcome);
  }

  private buildBuilding(id: string, b: (typeof BUILDINGS)[string]) {
    const g = new THREE.Group();
    const front = b.side * STREET_HALF; // z for fasaden
    const cz = front + b.side * (B_DEPTH / 2);
    const wall = mat(b.color, { rough: 0.85 });
    box(g, b.w, b.h, B_DEPTH, b.x, b.h / 2, cz, wall);
    if (b.style === 'hus') {
      // Saltak
      const shape = new THREE.Shape();
      shape.moveTo(-B_DEPTH / 2 - 0.4, 0);
      shape.lineTo(B_DEPTH / 2 + 0.4, 0);
      shape.lineTo(0, 2.6);
      shape.closePath();
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: b.w + 0.4, bevelEnabled: false }), mat(b.roof));
      // Trekanten står i xy-planet og strekkes langs z; snu slik at mønet går langs x
      roof.rotation.y = Math.PI / 2;
      roof.position.set(b.x - (b.w + 0.4) / 2, b.h, cz);
      g.add(roof);
    } else {
      box(g, b.w + 0.4, 0.4, B_DEPTH + 0.4, b.x, b.h + 0.2, cz, mat(b.roof));
    }
    const faceZ = front + -b.side * 0.01; // like utenfor fasaden
    // Vinduer
    const win = mat(0xbfdbfe, { emissive: 0x1e3a5f, rough: 0.2, metal: 0.3 });
    const floors = Math.max(1, Math.floor((b.h - 1) / 3));
    for (let f = 0; f < floors; f++) {
      for (let x = -b.w / 2 + 1.4; x <= b.w / 2 - 1.4; x += 2.4) {
        if (f === 0 && Math.abs(x) < 1.6) continue;
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), win);
        w.position.set(b.x + x, 1.8 + f * 3, faceZ);
        if (b.side > 0) w.rotation.y = Math.PI;
        g.add(w);
      }
    }
    if (b.style === 'verksted' || b.style === 'lager') {
      const port = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.2), mat(0x9ca3af, { metal: 0.4 }));
      port.position.set(b.x + b.w / 2 - 2.4, 1.6, faceZ);
      if (b.side > 0) port.rotation.y = Math.PI;
      g.add(port);
    }
    if (b.style === 'bygg') {
      // Stillas foran bygget
      const scaf = mat(0xf59e0b, { metal: 0.3 });
      for (let x = -b.w / 2; x <= b.w / 2; x += 2.6) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, b.h, 6), scaf);
        p.position.set(b.x + x, b.h / 2, front - b.side * 0.8);
        g.add(p);
      }
      for (let y = 2; y < b.h; y += 2.2) box(g, b.w, 0.08, 0.08, b.x, y, front - b.side * 0.8, scaf);
    }
    // Dør
    const door = mat(0x3f2a1c, { rough: 0.6 });
    const d = box(g, 1.6, 2.3, 0.08, b.x, 1.15, front - b.side * 0.03, door);
    d.renderOrder = 1;
    // Skilt
    const place = this.places.find((p) => p.id === id);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1), new THREE.MeshBasicMaterial({ map: textTexture([`${place?.icon ?? ''} ${place?.name ?? id}`], { w: 840, h: 200, size: 64 }) }));
    sign.position.set(b.x, 3.0, front - b.side * 0.06);
    if (b.side > 0) sign.rotation.y = Math.PI;
    g.add(sign);
    // «!» og lås over døra
    const news = sprite(['!'], 0.9, { w: 128, h: 128, bg: 'transparent', fg: '#facc15', size: 120 });
    news.position.set(b.x, 4.3, front - b.side * 0.4);
    const lock = sprite(['🔒 Låst'], 2.4, { w: 384, h: 128, bg: 'rgba(127,29,29,0.9)', size: 56 });
    lock.position.set(b.x, 2.2, front - b.side * 0.5);
    const barrier = box(g, 2.2, 1.1, 0.1, b.x, 0.55, front - b.side * 0.6, mat(0xdc2626, { transparent: 0.75 }));
    g.add(news, lock);
    this.markers.push({ obj: news, base: 4.3 });
    this.placeMarkers.set(id, { news, lock, barrier });
    this.outdoor.add(g);
    this.outColliders.push({ x1: b.x - b.w / 2, z1: Math.min(front, front + b.side * B_DEPTH), x2: b.x + b.w / 2, z2: Math.max(front, front + b.side * B_DEPTH) });
    this.outTargets.push({ x: b.x, z: front - b.side * 0.9, r: 2.6, target: { kind: 'door', place: id }, label: place?.name ?? id });
  }

  /** Oppdaterer hvilke steder som er åpne og har noe nytt */
  setPlaces(places: Place3D[]) {
    this.places = places;
    for (const [id, m] of this.placeMarkers) {
      const p = places.find((x) => x.id === id);
      const open = !!p?.open;
      m.news.visible = open && !!p?.news;
      m.lock.visible = !open;
      m.barrier.visible = !open;
    }
    for (const t of this.outTargets) if (t.target.kind === 'door') t.label = places.find((p) => p.id === (t.target as { place: string }).place)?.name ?? t.label;
  }

  // ------------------------------------------------------------------
  // Innendørs
  // ------------------------------------------------------------------
  private buildInterior(place: string) {
    const g = this.indoor;
    for (const c of [...g.children]) if (c !== this.npcGroup) {
      g.remove(c);
      this.disposeObject(c);
    }
    this.inColliders = [];
    this.inTargets = [];
    const layout = interiorLayout(place);
    const b = BUILDINGS[place];
    const W = ROOM_W / 2;
    const D = ROOM_D / 2;
    const H = 3.2;
    const floorColor = place === 'byggeplass' ? 0x8b8b83 : place === 'verksted' || place === 'grossist' ? 0x6b7280 : place === 'hjem' || place === 'kunder' ? 0xa47148 : 0xcbd5e1;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mat(floorColor, { rough: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, IN_Z);
    g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mat(0xf8fafc));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, IN_Z);
    g.add(ceil);
    const wallMat = mat(place === 'byggeplass' ? 0xa8a29e : new THREE.Color(b?.color ?? 0x94a3b8).lerp(new THREE.Color(0xffffff), 0.7).getHex());
    box(g, ROOM_W, H, 0.2, 0, H / 2, IN_Z - D - 0.1, wallMat);
    box(g, 0.2, H, ROOM_D, -W - 0.1, H / 2, IN_Z, wallMat);
    box(g, 0.2, H, ROOM_D, W + 0.1, H / 2, IN_Z, wallMat);
    box(g, ROOM_W, H, 0.2, 0, H / 2, IN_Z + D + 0.1, wallMat);
    this.inColliders.push(
      { x1: -W - 1, z1: IN_Z - D - 1, x2: W + 1, z2: IN_Z - D },
      { x1: -W - 1, z1: IN_Z + D, x2: W + 1, z2: IN_Z + D + 1 },
      { x1: -W - 1, z1: IN_Z - D, x2: -W, z2: IN_Z + D },
      { x1: W, z1: IN_Z - D, x2: W + 1, z2: IN_Z + D },
    );
    // Taklys
    const lamp = mat(0xffffff, { emissive: 0xfff7e0 });
    for (const x of [-4, 4]) for (const z of [-2, 2]) box(g, 1.2, 0.05, 0.3, x, H - 0.03, IN_Z + z, lamp);
    const light = new THREE.PointLight(0xfff4e0, 22, 22, 1.6);
    light.position.set(0, H - 0.4, IN_Z);
    g.add(light);
    // Tavle med navnet på stedet
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.3), new THREE.MeshBasicMaterial({ map: textTexture(layout.board, { w: 900, h: 260, size: 74, bg: place === 'skole' ? '#14532d' : '#0f172a' }) }));
    board.position.set(-1.2, 1.9, IN_Z - D + 0.02);
    g.add(board);
    // Utgang
    const exit = box(g, 1.6, 2.3, 0.08, 0, 1.15, IN_Z + D - 0.03, mat(0x3f2a1c));
    exit.name = 'exit';
    const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.35), new THREE.MeshBasicMaterial({ map: textTexture(['UTGANG'], { w: 256, h: 76, size: 50, bg: '#15803d' }) }));
    exitSign.position.set(0, 2.55, IN_Z + D - 0.05);
    exitSign.rotation.y = Math.PI;
    g.add(exitSign);
    this.inTargets.push({ x: 0, z: IN_Z + D - 0.6, r: 1.7, target: { kind: 'exit' }, label: 'Gå ut' });
    // Oppslagstavle med alt som finnes her
    const noticeTex = textTexture(['📌 Oppslagstavle', 'Alle oppdrag og hendelser her'], { w: 512, h: 300, size: 50, bg: '#7c4a1e' });
    const notice = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.95), new THREE.MeshBasicMaterial({ map: noticeTex }));
    notice.position.set(-W + 0.03, 1.6, IN_Z + D - 1.8);
    notice.rotation.y = Math.PI / 2;
    g.add(notice);
    this.inTargets.push({ x: -W + 0.6, z: IN_Z + D - 1.8, r: 2, target: { kind: 'board' }, label: 'Les oppslagstavla' });
    // Møbler
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (const it of layout.items) {
      const f: FurnitureItem = { type: it.type, w: it.w, d: it.d, wall: true, flat: it.flat };
      const m = buildFurniture(f, rnd);
      m.position.set(it.x, 0, IN_Z + it.z);
      m.rotation.y = it.rot ?? 0;
      g.add(m);
      if (!it.flat) {
        const turned = Math.abs(Math.sin(it.rot ?? 0)) > 0.5;
        const hw = (turned ? it.d : it.w) / 2;
        const hd = (turned ? it.w : it.d) / 2;
        this.inColliders.push({ x1: it.x - hw, z1: IN_Z + it.z - hd, x2: it.x + hw, z2: IN_Z + it.z + hd });
      }
    }
    for (const o of layout.objects) this.inTargets.push({ x: o.x, z: IN_Z + o.z, r: 2.1, target: { kind: o.kind }, label: o.label });
    this.spots = layout.spots;
    this.buildNpcs();
  }

  private spots: [number, number][] = [];

  /** Personene som er til stede (settes av React ut fra hva som skjer i historien) */
  setNpcs(npcs: Npc3D[]) {
    const key = (l: Npc3D[]) => l.map((n) => `${n.id}${n.mark}`).join(',');
    if (key(npcs) === key(this.npcs)) return;
    this.npcs = npcs;
    if (this.inside) this.buildNpcs();
  }

  private buildNpcs() {
    for (const c of [...this.npcGroup.children]) {
      this.npcGroup.remove(c);
      this.disposeObject(c);
    }
    this.markers = this.markers.filter((m) => m.obj.parent && !this.isInNpcGroup(m.obj));
    this.npcTargets = [];
    this.npcColliders = [];
    this.npcs.forEach((n, i) => {
      const spot = this.spots[i] ?? [-6 + i * 1.5, 3.5];
      const p = buildPerson(n.color, i + n.id.length);
      const x = spot[0];
      const z = IN_Z + spot[1];
      p.position.set(x, 0, z);
      p.userData.npc = n.id;
      this.npcGroup.add(p);
      const label = sprite([n.name, n.role], 1.9, { w: 512, h: 150, bg: 'rgba(15,23,42,0.8)', size: 46 });
      label.position.set(x, 2.22, z);
      this.npcGroup.add(label);
      if (n.mark) {
        const mk = sprite(['!'], 0.55, { w: 128, h: 128, bg: 'transparent', fg: '#facc15', size: 120 });
        mk.position.set(x, 2.7, z);
        this.npcGroup.add(mk);
        this.markers.push({ obj: mk, base: 2.7 });
      }
      this.npcTargets.push({ x, z, r: 2.3, target: { kind: 'npc', id: n.id }, label: n.name });
      this.npcColliders.push({ x1: x - 0.3, z1: z - 0.25, x2: x + 0.3, z2: z + 0.25 });
    });
  }
  private npcColliders: Collider[] = [];

  private isInNpcGroup(o: THREE.Object3D) {
    let p: THREE.Object3D | null = o;
    while (p) {
      if (p === this.npcGroup) return true;
      p = p.parent;
    }
    return false;
  }

  /** Gå inn i et bygg */
  enter(place: string, notify = true) {
    this.inside = place;
    this.buildInterior(place);
    this.outdoor.visible = false;
    this.indoor.visible = true;
    this.scene.background = new THREE.Color(0x1e293b);
    this.scene.fog = null;
    this.pos.set(0, EYE, IN_Z + ROOM_D / 2 - 2.3);
    this.yaw = 0;
    this.pitch = 0;
    if (notify) this.cb.onEnter(place);
  }

  /** Gå ut i byen, foran bygget man kom fra */
  exit() {
    const from = this.inside;
    this.inside = null;
    this.outdoor.visible = true;
    this.indoor.visible = false;
    this.scene.background = new THREE.Color(0x9cc9f5);
    this.scene.fog = new THREE.Fog(0x9cc9f5, 60, 140);
    this.placeOutside(from);
    this.cb.onEnter(null);
  }

  private placeOutside(from: string | null) {
    const b = from ? BUILDINGS[from] : undefined;
    this.outdoor.visible = true;
    this.indoor.visible = false;
    if (b) {
      this.pos.set(b.x, EYE, b.side * (STREET_HALF - 2.2));
      this.yaw = b.side < 0 ? Math.PI : 0;
    } else {
      this.pos.set(0, EYE, 3);
      this.yaw = Math.PI;
    }
    this.pitch = 0;
  }

  // ------------------------------------------------------------------
  // Styring
  // ------------------------------------------------------------------
  lock() {
    this.paused = false;
    if ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches) return this.enterFallback();
    const el = this.renderer.domElement as HTMLCanvasElement & { requestPointerLock: () => Promise<void> | void };
    try {
      const p = el.requestPointerLock();
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => this.enterFallback());
    } catch {
      this.enterFallback();
    }
  }

  private enterFallback() {
    if (this.paused) return;
    this.fallback = true;
    this.cb.onActiveChange(true);
    this.cb.onControlMode('drag');
  }

  /** Stopper styringen (f.eks. når en dialog vises) */
  pause() {
    this.paused = true;
    this.fallback = false;
    this.keys.clear();
    this.drag = null;
    this.touchMove = { f: 0, turn: 0 };
    if (document.pointerLockElement) document.exitPointerLock();
    this.cb.onActiveChange(false);
  }

  setTouch(f: number, turn: number) {
    this.touchMove = { f, turn };
  }

  pressInteract() {
    if (this.current) this.cb.onInteract(this.current.target);
  }

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    if (this.locked) {
      this.fallback = false;
      this.cb.onControlMode('locked');
    } else if (!this.fallback) {
      this.paused = true;
      this.keys.clear();
    }
    this.cb.onActiveChange(this.locked || this.fallback);
  };
  private onLockError = () => this.enterFallback();

  private onMouseDown = (e: MouseEvent) => {
    if (this.locked) {
      // Klikk = bruk
      this.pressInteract();
      return;
    }
    if (this.paused) return;
    this.drag = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };
  private onMouseUp = () => {
    this.drag = null;
  };
  private onMouseMove = (e: MouseEvent) => {
    if (this.locked) return this.look(e.movementX, e.movementY);
    if (this.drag && !this.paused) {
      this.look((e.clientX - this.drag.x) * 1.4, (e.clientY - this.drag.y) * 1.4);
      this.drag = { x: e.clientX, y: e.clientY };
    }
  };
  private look(dx: number, dy: number) {
    this.yaw -= dx * 0.0022;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy * 0.0022));
  }
  private touchLook: { x: number; y: number } | null = null;
  private onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    this.touchLook = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  };
  private onTouchMove = (e: TouchEvent) => {
    if (!this.touchLook) return;
    const t = e.touches[0];
    this.look((t.clientX - this.touchLook.x) * 1.6, (t.clientY - this.touchLook.y) * 1.6);
    this.touchLook = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  };
  private onTouchEnd = () => {
    this.touchLook = null;
  };
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.paused) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (!e.repeat && k === 'e') this.pressInteract();
    if (k === 'escape' && this.fallback) this.pause();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private collides(x: number, z: number) {
    const list = this.inside ? [...this.inColliders, ...this.npcColliders] : this.outColliders;
    for (const c of list) if (x + RADIUS > c.x1 && x - RADIUS < c.x2 && z + RADIUS > c.z1 && z - RADIUS < c.z2) return true;
    return false;
  }

  /** Nærmeste ting man ser på og kan bruke */
  private findTarget(): Interactable | null {
    const list = this.inside ? [...this.inTargets, ...this.npcTargets] : this.outTargets;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const t of list) {
      const dx = t.x - this.pos.x;
      const dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > t.r) continue;
      const dot = d < 0.6 ? 1 : (dx * fx + dz * fz) / d;
      if (dot < 0.55) continue;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  private promptFor(t: Interactable): string {
    switch (t.target.kind) {
      case 'door': {
        const p = this.places.find((x) => x.id === (t.target as { place: string }).place);
        if (!p?.open) return `🔒 ${t.label} er stengt${p?.lockText ? ` – ${p.lockText}` : ''}`;
        return `E / klikk: Gå inn i ${t.label}`;
      }
      case 'npc':
        return `E / klikk: Snakk med ${t.label}`;
      case 'exit':
        return 'E / klikk: Gå ut';
      default:
        return `E / klikk: ${t.label}`;
    }
  }

  private resize = () => {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private lastPrompt: string | null = null;

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.paused) {
      const speed = this.keys.has('shift') ? 6 : 3.4;
      let f = this.touchMove.f;
      let r = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
      if (this.keys.has('d')) r += 1;
      if (this.keys.has('a')) r -= 1;
      const turn = (this.keys.has('arrowleft') || this.keys.has('q') ? 1 : 0) - (this.keys.has('arrowright') ? 1 : 0) + this.touchMove.turn;
      this.yaw += turn * 2.2 * dt;
      const len = Math.hypot(f, r);
      if (len > 0) {
        f /= Math.max(1, len);
        r /= Math.max(1, len);
        const sin = Math.sin(this.yaw);
        const cos = Math.cos(this.yaw);
        const dx = (-sin * f + cos * r) * speed * dt;
        const dz = (-cos * f - sin * r) * speed * dt;
        if (!this.collides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
        if (!this.collides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
      }
    }
    // Personene snur seg mot deg når du er i nærheten
    for (const c of this.npcGroup.children) {
      if (!c.userData.npc) continue;
      const dx = this.pos.x - c.position.x;
      const dz = this.pos.z - c.position.z;
      if (Math.hypot(dx, dz) < 5) c.rotation.y += (Math.atan2(dx, dz) - c.rotation.y) * Math.min(1, dt * 4);
    }
    const t = performance.now() / 1000;
    for (const m of this.markers) m.obj.position.y = m.base + Math.sin(t * 3) * 0.08;
    this.current = this.findTarget();
    const prompt = this.current ? this.promptFor(this.current) : null;
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      this.cb.onPrompt(prompt);
    }
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.renderer.render(this.scene, this.camera);
  };

  private disposeObject(o: THREE.Object3D) {
    o.traverse((x) => {
      const m = x as THREE.Mesh;
      m.geometry?.dispose();
      const mats = (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) as THREE.Material[];
      for (const mt of mats) {
        (mt as THREE.MeshBasicMaterial).map?.dispose();
        mt.dispose();
      }
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    const el = this.renderer.domElement;
    el.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    el.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('pointerlockerror', this.onLockError);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    if (document.pointerLockElement) document.exitPointerLock();
    this.disposeObject(this.scene);
    this.renderer.dispose();
    el.remove();
  }

  /** For testing: plasser spilleren og se i en retning */
  debugPlace(x: number, z: number, yaw: number) {
    this.pos.set(x, EYE, z);
    this.yaw = yaw;
    this.current = this.findTarget();
    return this.current ? this.promptFor(this.current) : null;
  }
  debugState() {
    return { inside: this.inside, x: this.pos.x, z: this.pos.z, npcs: this.npcTargets.map((t) => t.label), targets: (this.inside ? this.inTargets : this.outTargets).map((t) => t.label) };
  }
}
