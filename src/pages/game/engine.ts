import * as THREE from 'three';
import type { Face, LevelDef, RoomDef, WallMount } from './levels';
import { checkWiring, initialControls, power, template, type CircuitSpec, type ControlState } from './wiring';
import { buildFurniture, furnitureFor, type FurnitureItem } from './furniture';
import { TOOLS, toolName, toolRef, type Tool } from './tools';

const WALL_H = 2.6;
const WALL_T = 0.15;
const EYE = 1.65;
const RADIUS = 0.24;
const REACH = 2.4;
const FLASH_INTENSITY = 5;

export interface BreakerState {
  id: string;
  name: string;
  on: boolean;
  locked: boolean;
  tripped: boolean;
}

export interface RoomState {
  def: RoomDef;
  /** Kretstype og anleggstype for rommet */
  spec: CircuitSpec;
  conns: string[];
  /** Stilling på hver styring (bryter 0/1, dimmer 0–3, kronebryter 0–3, sensor 0/1) */
  ctrl: ControlState;
  /** Spenningsløshet kontrollert med måleinstrument siden kursen sist var på */
  measured: boolean;
  complete: boolean;
  rewarded: boolean;
  /** Lederender som er avisolert (med avisoleringstang) */
  stripped: string[];
}

export interface GameState {
  breakers: BreakerState[];
  rooms: RoomState[];
  score: number;
  violations: number;
  hintsUsed: number;
  startTime: number;
  endTime: number | null;
  won: boolean;
  flashlight: boolean;
  currentRoom: string | null;
  /** Verktøyet spilleren har i hånda */
  tool: Tool;
}

export type MessageKind = 'info' | 'ok' | 'warn' | 'danger';

export interface GameCallbacks {
  onChange: () => void;
  onPrompt: (text: string | null) => void;
  onMessage: (text: string, kind: MessageKind) => void;
  onOpenPanel: () => void;
  onOpenBox: (roomId: string) => void;
  onLockChange: (locked: boolean) => void;
  /** Måleinstrument/kontrolltester: forklaring, om alt er i orden, og kort tekst for displayet */
  onMeasure: (text: string, ok: boolean, screen: string) => void;
  /** «locked» = musa styrer blikket direkte, «drag» = dra med musa for å se rundt */
  onControlMode: (mode: 'locked' | 'drag') => void;
}

interface Collider {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

type Interactable = { kind: 'switch' | 'socket' | 'sensor' | 'box' | 'panel' | 'door'; roomId?: string; ctrl?: string; load?: string; door?: number };

export type TimeOfDay = 'dag' | 'natt';

interface DoorState {
  pivot: THREE.Group;
  open: boolean;
  angle: number;
  closedAngle: number;
  openAngle: number;
  hx: number;
  hz: number;
  width: number;
  collider: Collider;
  front: boolean;
}

interface ControlVisual {
  rockers: THREE.Mesh[];
  knob?: THREE.Mesh;
  lens?: THREE.MeshStandardMaterial;
}

/** 3D-objekter som endres når tilstanden i et rom endres */
interface RoomVisual {
  lamps: Record<string, { light: THREE.PointLight; bulb: THREE.MeshStandardMaterial }>;
  floors: Record<string, { light: THREE.PointLight; shade: THREE.MeshStandardMaterial; led?: THREE.MeshStandardMaterial }>;
  controls: Record<string, ControlVisual>;
}

const FACE_DIR: Record<Face, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const FACE_ROT: Record<Face, number> = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };

function textTexture(lines: string[], opts: { w?: number; h?: number; bg?: string; fg?: string; size?: number } = {}) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = opts.bg ?? '#0f172a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = opts.fg ?? '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = opts.size ?? 44;
  lines.forEach((l, i) => {
    g.font = `${i === 0 ? 700 : 500} ${i === 0 ? size : size * 0.7}px Inter, Segoe UI, Arial`;
    g.fillText(l, w / 2, (h / (lines.length + 1)) * (i + 1));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Game {
  state: GameState;
  private level: LevelDef;
  private cb: GameCallbacks;
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private colliders: Collider[] = [];
  private rayTargets: THREE.Object3D[] = [];
  private visuals = new Map<string, RoomVisual>();
  private doors: DoorState[] = [];
  private time: TimeOfDay;
  private flash: THREE.SpotLight;
  private yaw = 0;
  private pitch = 0;
  private pos: THREE.Vector3;
  private keys = new Set<string>();
  /** Bevegelse fra berøringsknapper */
  touchMove = { f: 0, r: 0 };
  private locked = false;
  private paused = true;
  private raf = 0;
  private lastPrompt: string | null = null;
  private target: { obj: Interactable } | null = null;
  private disposed = false;
  private dragLook: { x: number; y: number } | null = null;
  private mouseDrag: { x: number; y: number } | null = null;
  private fallback = false;
  /** Snu fra knapper på skjermen (−1, 0 eller 1) */
  touchTurn = 0;

  constructor(container: HTMLElement, level: LevelDef, cb: GameCallbacks, time: TimeOfDay = 'natt') {
    this.container = container;
    this.level = level;
    this.cb = cb;
    this.time = time;
    this.state = {
      breakers: level.breakers.map((b) => ({ ...b, locked: false, tripped: false })),
      rooms: level.rooms.map((r) => {
        const spec: CircuitSpec = { kind: r.circuit ?? 'lys-enpolet', net: level.net ?? 'TN' };
        // Ender som allerede er skjøtt (av forrige montør) er avisolert
        const stripped = [...new Set((r.preset ?? []).flatMap((c) => c.split('|')))];
        return { def: r, spec, conns: [...(r.preset ?? [])], ctrl: initialControls(spec, !!r.switchOn), measured: false, complete: false, rewarded: false, stripped };
      }),
      score: 0,
      violations: 0,
      hintsUsed: 0,
      startTime: Date.now(),
      endTime: null,
      won: false,
      flashlight: time === 'natt',
      currentRoom: null,
      tool: 'hand',
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'game-canvas';

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
    this.pos = new THREE.Vector3(level.spawn.x, EYE, level.spawn.z);
    this.scene.add(this.camera);

    // Myk lommelykt med bred kjegle og rask avtagning, så den ikke blender på kort hold
    this.flash = new THREE.SpotLight(0xfff4e0, FLASH_INTENSITY, 14, 0.6, 0.9, 2);
    this.flash.position.set(0.15, -0.15, 0);
    this.camera.add(this.flash);
    this.camera.add(this.flash.target);
    this.flash.target.position.set(0, 0, -1);

    this.buildWorld();
    // Kretser med feil som allerede er spenningssatt (f.eks. kortslutning) løser ut med en gang
    for (const b of this.state.breakers) if (b.on) this.checkShorts(b.id, true);
    this.updateLights();
    this.updateCompletion(true);

    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('pointerlockerror', this.onLockError);
    document.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    const el = this.renderer.domElement;
    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd);
    this.loop();
  }

  // ------------------------------------------------------------------
  // Verden
  // ------------------------------------------------------------------
  private buildWorld() {
    const s = this.scene;
    const L = this.level;
    const day = this.time === 'dag';
    if (day) {
      // Dag: blå himmel, sol og mer lys ute. Inne er det fortsatt dempet uten taklys.
      s.background = new THREE.Color(0x87c5f0);
      s.fog = new THREE.Fog(0xbfe0f5, 35, 110);
      s.add(new THREE.HemisphereLight(0xdbeeff, 0x4d6b3a, 1.1));
      const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
      sun.position.set(25, 40, 18);
      s.add(sun);
      const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }));
      sunDisc.position.set(60, 70, -90);
      s.add(sunDisc);
      // Noen skyer
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.35 });
      for (const [cx, cy, cz] of [
        [-30, 28, -60],
        [10, 32, -70],
        [45, 26, -40],
        [-55, 30, 10],
      ]) {
        const cloud = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + (i % 2), 12, 8), cloudMat);
          puff.position.set(i * 3.2 - 5, (i % 2) * 1.2, (i % 3) - 1);
          cloud.add(puff);
        }
        cloud.position.set(cx, cy, cz);
        s.add(cloud);
      }
    } else {
      s.background = new THREE.Color(0x0a1330);
      s.fog = new THREE.Fog(0x0a1330, 18, 70);
      s.add(new THREE.HemisphereLight(0x6f86c9, 0x1a2a1a, 0.55));
      const moon = new THREE.DirectionalLight(0xaabbff, 0.55);
      moon.position.set(-20, 30, 10);
      s.add(moon);
      // Stjerner
      const starGeo = new THREE.BufferGeometry();
      const pts: number[] = [];
      for (let i = 0; i < 500; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI * 0.45;
        pts.push(Math.cos(th) * Math.sin(ph) * 120, Math.cos(ph) * 120 + 5, Math.sin(th) * Math.sin(ph) * 120);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      s.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, fog: false })));
      const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe8eefc, fog: false }));
      moonDisc.position.set(-60, 60, -80);
      s.add(moonDisc);
    }

    // Bakke, vei og fortau
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x1d3a22, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);
    const roadZ = L.bounds.z2 + 9;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(160, 6), new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.9 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, roadZ);
    s.add(road);
    for (let x = -78; x < 80; x += 6) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.15), new THREE.MeshBasicMaterial({ color: 0xd4d4d4 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, roadZ);
      s.add(m);
    }
    // Gangsti til døren
    const pathLen = roadZ - 3 - L.bounds.z2;
    const path = new THREE.Mesh(new THREE.PlaneGeometry(1.4, pathLen), new THREE.MeshStandardMaterial({ color: 0x6b6458, roughness: 1 }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(L.sign.x, 0.015, L.bounds.z2 + pathLen / 2);
    s.add(path);

    // Gulv, tak og vegger
    const { x1, z1, x2, z2 } = L.bounds;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    s.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set((x1 + x2) / 2, WALL_H, (z1 + z2) / 2);
    s.add(ceil);
    // Pyramidetak: kjegle med 4 sider (sidelengde √2 ved radius 1), skalert til husets mål + takutstikk
    const roofGeo = new THREE.ConeGeometry(1, 2.2, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x5b2420, roughness: 0.9, flatShading: true }));
    roof.scale.set((x2 - x1 + 1) / Math.SQRT2, 1, (z2 - z1 + 1) / Math.SQRT2);
    roof.position.set((x1 + x2) / 2, WALL_H + 1.1, (z1 + z2) / 2);
    s.add(roof);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.9 });
    for (const w of L.walls) this.buildWall(w.x1, w.z1, w.x2, w.z2, w.doors ?? [], wallMat);

    // Skilt over inngangen
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: textTexture([L.customer, L.name], { bg: '#1e3a8a', size: 52 }) }),
    );
    // Rett over døråpningen (overkant dør 2,1 m), under takutstikket
    sign.position.set(L.sign.x, 2.36, L.sign.z + WALL_T / 2 + 0.02);
    s.add(sign);

    // Firmabil
    const vanX = L.sign.x + 5;
    const van = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2, 2), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 }));
    body.position.y = 1.25;
    van.add(body);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: textTexture(['ElektroStudio', 'Elektriker på oppdrag'], { bg: '#2563eb', size: 54 }) }));
    logo.position.set(0, 1.4, 1.01);
    van.add(logo);
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const [wx, wz] of [
      [-1.5, 1],
      [1.5, 1],
      [-1.5, -1],
      [1.5, -1],
    ]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.38, wz);
      van.add(wh);
    }
    van.position.set(vanX, 0, roadZ - 1.6);
    s.add(van);
    this.colliders.push({ x1: vanX - 2.4, z1: roadZ - 2.7, x2: vanX + 2.4, z2: roadZ - 0.5 });

    // Gatelykter (bare glødende hoder for stemning)
    for (const gx of [-14, 14]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      pole.position.set(gx, 2, roadZ - 3.6);
      s.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffc46b, emissiveIntensity: day ? 0 : 2 }));
      head.position.set(gx, 4.05, roadZ - 3.6);
      s.add(head);
      if (!day) {
        const l = new THREE.PointLight(0xffc98a, 18, 16, 1.6);
        l.position.set(gx, 3.8, roadZ - 3.6);
        s.add(l);
      }
    }
    // Trær
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3222 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x173d24, flatShading: true });
    const trees = [
      [x1 - 5, z1 - 3],
      [x2 + 6, z1 - 1],
      [x1 - 7, z2 + 2],
      [x2 + 9, z2 + 1],
      [x1 - 3, z1 - 9],
      [x2 + 3, z1 - 8],
    ];
    for (const [tx, tz] of trees) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6), trunkMat);
      t.position.set(tx, 0.8, tz);
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 7), leafMat);
      c.position.set(tx, 3, tz);
      s.add(t, c);
      this.colliders.push({ x1: tx - 0.3, z1: tz - 0.3, x2: tx + 0.3, z2: tz + 0.3 });
    }
    // Usynlig gjerde rundt området
    const B = 40;
    this.colliders.push({ x1: -B - 1, z1: -B - 1, x2: B + 1, z2: -B }, { x1: -B - 1, z1: B, x2: B + 1, z2: B + 1 }, { x1: -B - 1, z1: -B, x2: -B, z2: B }, { x1: B, z1: -B, x2: B + 1, z2: B });

    // Rom: lamper, brytere og koblingsbokser
    for (const r of this.level.rooms) this.buildRoom(r);
    this.buildPanel(this.level.panel);
    for (const r of this.level.rooms) this.furnishRoom(r);
    for (const w of L.walls) for (const d of w.doors ?? []) this.buildDoor(w, d);
  }

  // ------------------------------------------------------------------
  // Dører: hengslet i den ene kanten av åpningen, åpnes/lukkes med E
  // ------------------------------------------------------------------
  private buildDoor(w: { x1: number; z1: number; x2: number; z2: number }, d: { at: number; width: number }) {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const dx = (w.x2 - w.x1) / len;
    const dz = (w.z2 - w.z1) / len;
    const width = d.width - 0.04;
    const hx = w.x1 + dx * (d.at - d.width / 2 + 0.02);
    const hz = w.z1 + dz * (d.at - d.width / 2 + 0.02);
    const front = Math.abs(dx) > Math.abs(dz) && Math.abs(w.z1 - this.level.bounds.z2) < 0.01;
    const pivot = new THREE.Group();
    pivot.position.set(hx, 0, hz);
    const closedAngle = Math.atan2(-dz, dx);
    // +90° svinger døren inn i huset for inngangsdøren (mot −z) – samme regel for innerdører
    const openAngle = closedAngle + Math.PI / 2;
    pivot.rotation.y = closedAngle;
    const leafMat = new THREE.MeshStandardMaterial({ color: front ? 0x7c2d12 : 0xf5f0e6, roughness: 0.6 });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, 2.05, 0.045), leafMat);
    leaf.position.set(width / 2, 1.025, 0);
    const index = this.doors.length;
    leaf.userData.interact = { kind: 'door', door: index } satisfies Interactable;
    pivot.add(leaf);
    // Fyllinger og håndtak på begge sider
    const panelMat = new THREE.MeshStandardMaterial({ color: front ? 0x6b2410 : 0xe7e1d4, roughness: 0.7 });
    for (const side of [-1, 1]) {
      for (const py of [0.55, 1.45]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(width - 0.25, 0.7, 0.01), panelMat);
        p.position.set(width / 2, py, side * 0.026);
        pivot.add(p);
      }
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.3 }));
      handle.position.set(width - 0.12, 1.0, side * 0.045);
      pivot.add(handle);
    }
    this.scene.add(pivot);
    this.rayTargets.push(leaf);
    const collider: Collider = { x1: 0, z1: 0, x2: 0, z2: 0 };
    this.colliders.push(collider);
    const door: DoorState = { pivot, open: false, angle: closedAngle, closedAngle, openAngle, hx, hz, width, collider, front };
    this.doors.push(door);
    this.setDoorCollider(door);
  }

  /** Kollisjonsboks for døren i endelig stilling (lukket: i åpningen, åpen: vinkelrett ut fra hengselen) */
  private setDoorCollider(d: DoorState) {
    const a = d.open ? d.openAngle : d.closedAngle;
    const ex = d.hx + Math.cos(a) * d.width;
    const ez = d.hz - Math.sin(a) * d.width;
    const t = 0.04;
    d.collider.x1 = Math.min(d.hx, ex) - t;
    d.collider.x2 = Math.max(d.hx, ex) + t;
    d.collider.z1 = Math.min(d.hz, ez) - t;
    d.collider.z2 = Math.max(d.hz, ez) + t;
  }

  private toggleDoor(i: number) {
    const d = this.doors[i];
    if (!d) return;
    const wasOpen = d.open;
    d.open = !d.open;
    this.setDoorCollider(d);
    if (this.collides(this.pos.x, this.pos.z)) {
      // Ikke lukk/åpne døren inn i spilleren
      d.open = wasOpen;
      this.setDoorCollider(d);
      this.cb.onMessage('Gå litt unna døren først.', 'info');
    }
  }

  /** Åpner alle dører – brukes til automatisk testing */
  debugOpenAllDoors() {
    for (const d of this.doors) {
      d.open = true;
      d.angle = d.openAngle;
      d.pivot.rotation.y = d.angle;
      this.setDoorCollider(d);
    }
  }

  private buildWall(x1: number, z1: number, x2: number, z2: number, doors: { at: number; width: number }[], mat: THREE.Material) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const dx = (x2 - x1) / len;
    const dz = (z2 - z1) / len;
    const cuts = [...doors].sort((a, b) => a.at - b.at);
    const pieces: [number, number, number, number][] = []; // start, slutt, bunn, topp
    let cur = 0;
    for (const d of cuts) {
      const a = d.at - d.width / 2;
      const b = d.at + d.width / 2;
      if (a > cur) pieces.push([cur, a, 0, WALL_H]);
      pieces.push([a, b, 2.1, WALL_H]); // overligger
      cur = b;
    }
    if (cur < len) pieces.push([cur, len, 0, WALL_H]);
    for (const [a0, b0, y0, y1] of pieces) {
      if (b0 - a0 <= 0.001) continue;
      // Forleng bare veggens ytterender (for å dekke hjørnene), aldri inn i en døråpning
      const a = a0 <= 0.001 ? a0 - WALL_T / 2 : a0;
      const b = b0 >= len - 0.001 ? b0 + WALL_T / 2 : b0;
      const pl = b - a;
      const cx = x1 + dx * (a + pl / 2);
      const cz = z1 + dz * (a + pl / 2);
      const horizontal = Math.abs(dx) > Math.abs(dz);
      const geo = new THREE.BoxGeometry(horizontal ? pl : WALL_T, y1 - y0, horizontal ? WALL_T : pl);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(cx, (y0 + y1) / 2, cz);
      this.scene.add(m);
      this.rayTargets.push(m);
      if (y0 === 0) {
        const hw = (horizontal ? pl : WALL_T) / 2;
        const hd = (horizontal ? WALL_T : pl) / 2;
        this.colliders.push({ x1: cx - hw, z1: cz - hd, x2: cx + hw, z2: cz + hd });
      }
    }
  }

  /** Plasserer et objekt på veggflaten, med fronten inn i rommet */
  private mount(obj: THREE.Object3D, m: WallMount, y: number, depth: number) {
    const [fx, fz] = FACE_DIR[m.face];
    obj.position.set(m.x + fx * (WALL_T / 2 + depth / 2), y, m.z + fz * (WALL_T / 2 + depth / 2));
    obj.rotation.y = FACE_ROT[m.face];
  }

  /**
   * Usynlig treffboks for et veggmontert objekt. Baksiden ligger nøyaktig på veggflaten
   * (objDepth = dybden på objektet den hører til), slik at den aldri stikker gjennom veggen
   * og kan treffes fra rommet på andre siden.
   */
  private hitbox(w: number, h: number, d: number, objDepth: number, data: Interactable) {
    const hb = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hb.position.z = d / 2 - objDepth / 2 + 0.002;
    hb.userData.interact = data;
    this.rayTargets.push(hb);
    return hb;
  }

  private specOf(r: RoomDef): CircuitSpec {
    return { kind: r.circuit ?? 'lys-enpolet', net: this.level.net ?? 'TN' };
  }

  /** Plassering av alt utstyr i rommet (standardverdier beregnes fra rommets mål) */
  private mountsOf(r: RoomDef) {
    const spec = this.specOf(r);
    const t = template(spec);
    const onlySockets = t.loads.every((l) => l.kind === 'stikk');
    const W = r.x2 - r.x1;
    const twoLamps = t.loads.filter((l) => l.kind === 'lampe').length > 1;
    return {
      switch: r.switch,
      switch2: r.switch2 ?? ({ x: r.x2, z: r.z2 - 0.6, face: 'w' } as WallMount),
      sensor: r.switch,
      socket0: onlySockets ? r.switch : (r.socket ?? ({ x: r.x1 + 0.8, z: r.z2, face: 'n' } as WallMount)),
      socket1: r.socket2 ?? ({ x: r.x2, z: r.z1 + 1.2, face: 'w' } as WallMount),
      lamp0: twoLamps ? { x: r.lamp.x - W / 5, z: r.lamp.z } : r.lamp,
      lamp1: { x: r.lamp.x + W / 5, z: r.lamp.z },
    };
  }

  private buildRoom(r: RoomDef) {
    const s = this.scene;
    const spec = this.specOf(r);
    const t = template(spec);
    const m = this.mountsOf(r);
    const vis: RoomVisual = { lamps: {}, floors: {}, controls: {} };
    this.visuals.set(r.id, vis);
    const white = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const offWhite = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });

    // --- Laster: taklamper og stikkontakter ---
    for (const ld of t.loads) {
      if (ld.kind === 'lampe') {
        const pos = ld.mount === 'lamp1' ? m.lamp1 : m.lamp0;
        const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.08, 24), new THREE.MeshStandardMaterial({ color: 0xe5e7eb }));
        fixture.position.set(pos.x, WALL_H - 0.04, pos.z);
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff7e0, emissive: 0xffd58a, emissiveIntensity: 0 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bulbMat);
        bulb.position.set(pos.x, WALL_H - 0.08, pos.z);
        const light = new THREE.PointLight(0xffe1b0, 0, 0, 1.4);
        light.position.set(pos.x, WALL_H - 0.35, pos.z);
        s.add(fixture, bulb, light);
        vis.lamps[ld.id] = { light, bulb: bulbMat };
        continue;
      }
      // Stikkontakt nede på veggen + standerlampe som står koblet til den
      const mt = ld.mount === 'socket1' ? m.socket1 : m.socket0;
      const outdoor = spec.kind === 'stikk-ute';
      const sk = new THREE.Group();
      sk.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.025), outdoor ? new THREE.MeshStandardMaterial({ color: 0x64748b }) : white));
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 24), new THREE.MeshStandardMaterial({ color: outdoor ? 0x475569 : 0xe5e7eb }));
      face.rotation.x = Math.PI / 2;
      face.position.z = 0.016;
      for (const hx of [-0.01, 0.01]) {
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.012, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        hole.position.set(hx, 0.002, 0);
        face.add(hole);
      }
      sk.add(face);
      if (outdoor) {
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        lid.position.set(0, 0.05, 0.03);
        sk.add(lid);
      }
      let led: THREE.MeshStandardMaterial | undefined;
      if (spec.kind === 'stikk-usb') {
        for (const ux of [-0.018, 0.018]) {
          const usb = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: 0x111111 }));
          usb.position.set(ux, -0.036, 0.014);
          sk.add(usb);
        }
        led = new THREE.MeshStandardMaterial({ color: 0x14532d, emissive: 0x22c55e, emissiveIntensity: 0 });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), led);
        dot.position.set(0, 0.036, 0.014);
        sk.add(dot);
      }
      sk.add(this.hitbox(0.34, 0.3, 0.14, 0.025, { kind: 'socket', roomId: r.id, load: ld.id }));
      this.mount(sk, mt, 0.35, 0.025);
      s.add(sk);

      const [fx, fz] = FACE_DIR[mt.face];
      const lx = mt.x + fx * 0.55 - fz * 0.6;
      const lz = mt.z + fz * 0.55 + fx * 0.6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.45), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
      pole.position.set(lx, 0.725, lz);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
      foot.position.set(lx, 0.015, lz);
      const shadeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xffd58a, emissiveIntensity: 0, side: THREE.DoubleSide });
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.26, 24, 1, true), shadeMat);
      shade.position.set(lx, 1.5, lz);
      const fl = new THREE.PointLight(0xffd9a0, 0, 0, 1.5);
      fl.position.set(lx, 1.4, lz);
      s.add(pole, foot, shade, fl);
      vis.floors[ld.id] = { light: fl, shade: shadeMat, led };
    }

    // --- Styringer: brytere, dimmer, sensor ---
    for (const cd of t.controls) {
      const cv: ControlVisual = { rockers: [] };
      vis.controls[cd.id] = cv;
      const g = new THREE.Group();
      if (cd.kind === 'pir') {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), white);
        const lens = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, emissive: 0xef4444, emissiveIntensity: 0, roughness: 0.2 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lens);
        dome.rotation.x = Math.PI / 2;
        dome.position.z = 0.015;
        g.add(base, dome);
        cv.lens = lens;
        g.add(this.hitbox(0.3, 0.3, 0.14, 0.03, { kind: 'sensor', roomId: r.id, ctrl: cd.id }));
        this.mount(g, m.sensor, 2.25, 0.03);
        s.add(g);
        continue;
      }
      if (cd.kind === 'dimmer') {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), white));
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.025, 20), offWhite);
        knob.rotation.x = Math.PI / 2;
        knob.position.z = 0.02;
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.004), new THREE.MeshStandardMaterial({ color: 0x334155 }));
        mark.position.set(0, 0.012, 0.014);
        knob.add(mark);
        g.add(knob);
        cv.knob = knob;
      } else {
        const two = cd.kind === 'topolet' || cd.kind === 'krone';
        g.add(new THREE.Mesh(new THREE.BoxGeometry(two ? 0.14 : 0.09, 0.09, 0.02), white));
        for (const x of two ? [-0.032, 0.032] : [0]) {
          const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), offWhite);
          rocker.position.set(x, 0, 0.012);
          g.add(rocker);
          cv.rockers.push(rocker);
        }
        if (cd.kind === 'veksel') {
          // Liten pil som skiller vekselbryteren fra en vanlig bryter
          const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.03, 0.003), new THREE.MeshStandardMaterial({ color: 0x64748b }));
          arrow.position.set(0, 0, 0.024);
          g.add(arrow);
        }
      }
      g.add(this.hitbox(0.3, 0.3, 0.12, 0.02, { kind: 'switch', roomId: r.id, ctrl: cd.id }));
      this.mount(g, cd.mount === 'switch2' ? m.switch2 : m.switch, 1.1, 0.02);
      s.add(g);
    }

    // Koblingsboks
    const bx = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 }));
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.01), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
    lid.position.z = 0.045;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085), new THREE.MeshBasicMaterial({ map: textTexture(['Koblingsboks'], { w: 256, h: 64, size: 34, bg: '#facc15', fg: '#111' }) }));
    label.position.set(0, 0.16, 0.0);
    bx.add(box, lid, label);
    bx.add(this.hitbox(0.42, 0.42, 0.25, 0.08, { kind: 'box', roomId: r.id }));
    this.mount(bx, r.box, 1.55, 0.08);
    s.add(bx);

    // Kabel fra boks opp til taket (pynt)
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.03, WALL_H - 1.65, 0.03), new THREE.MeshStandardMaterial({ color: 0xe5e7eb }));
    this.mount(cable, r.box, 1.65 + (WALL_H - 1.65) / 2, 0.03);
    s.add(cable);
  }

  // ------------------------------------------------------------------
  // Møbler: plasseres langs veggene og fritt i rommet, men aldri foran dører,
  // brytere, bokser, stikkontakter eller sikringsskap. Etter hvert møbel sjekkes det
  // at alle dører og alt utstyr fortsatt kan nås – ellers droppes møbelet.
  // ------------------------------------------------------------------
  private furnishRoom(r: RoomDef) {
    const CELL = 0.1;
    const ix1 = r.x1 + WALL_T / 2 + 0.02;
    const iz1 = r.z1 + WALL_T / 2 + 0.02;
    const ix2 = r.x2 - WALL_T / 2 - 0.02;
    const iz2 = r.z2 - WALL_T / 2 - 0.02;
    const nx = Math.floor((ix2 - ix1) / CELL);
    const nz = Math.floor((iz2 - iz1) / CELL);
    if (nx < 5 || nz < 5) return;
    const blocked = new Uint8Array(nx * nz);
    const occ = new Uint8Array(nx * nz);
    const cx = (x: number) => Math.floor((x - ix1) / CELL);
    const cz = (z: number) => Math.floor((z - iz1) / CELL);
    const markRect = (arr: Uint8Array, x1: number, z1: number, x2: number, z2: number) => {
      for (let i = Math.max(0, cx(Math.min(x1, x2))); i <= Math.min(nx - 1, cx(Math.max(x1, x2))); i++)
        for (let j = Math.max(0, cz(Math.min(z1, z2))); j <= Math.min(nz - 1, cz(Math.max(z1, z2))); j++) arr[j * nx + i] = 1;
    };
    const required: [number, number][] = [];

    // Dører på rommets kant
    for (const w of this.level.walls) {
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
      const dx = (w.x2 - w.x1) / len;
      const dz = (w.z2 - w.z1) / len;
      const horizontal = Math.abs(dx) > Math.abs(dz);
      for (const d of w.doors ?? []) {
        const px = w.x1 + dx * d.at;
        const pz = w.z1 + dz * d.at;
        const half = d.width / 2 + 0.35;
        if (horizontal && px > r.x1 && px < r.x2) {
          if (Math.abs(pz - r.z1) < 0.1) (markRect(blocked, px - half, iz1, px + half, iz1 + 1.4), required.push([px, iz1 + 0.5]));
          if (Math.abs(pz - r.z2) < 0.1) (markRect(blocked, px - half, iz2 - 1.4, px + half, iz2), required.push([px, iz2 - 0.5]));
        }
        if (!horizontal && pz > r.z1 && pz < r.z2) {
          if (Math.abs(px - r.x1) < 0.1) (markRect(blocked, ix1, pz - half, ix1 + 1.4, pz + half), required.push([ix1 + 0.5, pz]));
          if (Math.abs(px - r.x2) < 0.1) (markRect(blocked, ix2 - 1.4, pz - half, ix2, pz + half), required.push([ix2 - 0.5, pz]));
        }
      }
    }
    if (required.length === 0) return;

    // Utstyr på veggene som skal kunne nås: fri sone foran
    const spec = this.specOf(r);
    const t = template(spec);
    const m = this.mountsOf(r);
    const mounts: WallMount[] = [r.box];
    for (const cd of t.controls) mounts.push(cd.mount === 'switch2' ? m.switch2 : m.switch);
    for (const ld of t.loads) if (ld.kind === 'stikk') mounts.push(ld.mount === 'socket1' ? m.socket1 : m.socket0);
    const p = this.level.panel;
    if (p.x >= r.x1 - 0.1 && p.x <= r.x2 + 0.1 && p.z >= r.z1 - 0.1 && p.z <= r.z2 + 0.1) mounts.push(p);
    for (const mt of mounts) {
      const [fx, fz] = FACE_DIR[mt.face];
      const ax = Math.abs(fz);
      const az = Math.abs(fx); // retning langs veggen
      markRect(blocked, mt.x - ax * 0.6 + Math.min(0, fx) * 1.2, mt.z - az * 0.6 + Math.min(0, fz) * 1.2, mt.x + ax * 0.6 + Math.max(0, fx) * 1.2, mt.z + az * 0.6 + Math.max(0, fz) * 1.2);
      required.push([mt.x + fx * 0.75, mt.z + fz * 0.75]);
    }
    // Standerlamper ved stikkontaktene
    for (const ld of t.loads) {
      if (ld.kind !== 'stikk') continue;
      const mt = ld.mount === 'socket1' ? m.socket1 : m.socket0;
      const [fx, fz] = FACE_DIR[mt.face];
      const lx = mt.x + fx * 0.55 - fz * 0.6;
      const lz = mt.z + fz * 0.55 + fx * 0.6;
      markRect(blocked, lx - 0.35, lz - 0.35, lx + 0.35, lz + 0.35);
    }

    // Kan alle viktige punkter nås fra første dør?
    const reachable = () => {
      const R = 3; // spillerens radius i celler
      const walk = new Uint8Array(nx * nz);
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          let ok = 1;
          for (let a = -R; a <= R && ok; a++)
            for (let b = -R; b <= R; b++) {
              const ii = i + a;
              const jj = j + b;
              if (ii >= 0 && jj >= 0 && ii < nx && jj < nz && occ[jj * nx + ii]) {
                ok = 0;
                break;
              }
            }
          walk[j * nx + i] = ok;
        }
      const clampCell = (x: number, z: number) => [Math.min(nx - 1, Math.max(0, cx(x))), Math.min(nz - 1, Math.max(0, cz(z)))];
      const [si, sj] = clampCell(required[0][0], required[0][1]);
      const seen = new Uint8Array(nx * nz);
      const stack = [sj * nx + si];
      seen[sj * nx + si] = 1;
      while (stack.length) {
        const k = stack.pop()!;
        const i = k % nx;
        const j = (k - i) / nx;
        for (const [a, b] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const ii = i + a;
          const jj = j + b;
          if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
          const kk = jj * nx + ii;
          if (seen[kk] || !walk[kk]) continue;
          seen[kk] = 1;
          stack.push(kk);
        }
      }
      return required.every(([x, z]) => {
        const [i, j] = clampCell(x, z);
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (seen[(j + b) * nx + (i + a)] && j + b >= 0 && j + b < nz && i + a >= 0 && i + a < nx) return true;
        return false;
      });
    };

    // Fast tilfeldighet per rom, slik at rommet ser likt ut hver gang
    let seed = 0;
    for (const ch of this.level.id + r.id) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };

    const fits = (x1: number, z1: number, x2: number, z2: number) => {
      if (x1 < ix1 - 0.001 || z1 < iz1 - 0.001 || x2 > ix2 + 0.001 || z2 > iz2 + 0.001) return false;
      for (let i = cx(x1 + 0.02); i <= cx(x2 - 0.02); i++)
        for (let j = cz(z1 + 0.02); j <= cz(z2 - 0.02); j++) {
          if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
          if (blocked[j * nx + i] || occ[j * nx + i]) return false;
        }
      return true;
    };

    const place = (item: FurnitureItem, x: number, z: number, rot: number, fw: number, fd: number) => {
      const g = buildFurniture(item, rnd);
      g.position.set(x, 0, z);
      g.rotation.y = rot;
      this.scene.add(g);
      if (!item.flat) this.colliders.push({ x1: x - fw / 2 + 0.03, z1: z - fd / 2 + 0.03, x2: x + fw / 2 - 0.03, z2: z + fd / 2 - 0.03 });
    };

    for (const item of furnitureFor(r.name)) {
      if (item.flat) {
        // Teppe midt i rommet – kan gås over
        const W = Math.min(item.w, ix2 - ix1 - 1.2);
        const D = Math.min(item.d, iz2 - iz1 - 1.2);
        if (W > 0.8 && D > 0.6) place({ ...item, w: W, d: D }, (ix1 + ix2) / 2, (iz1 + iz2) / 2, 0, W, D);
        continue;
      }
      const candidates: { x: number; z: number; rot: number; fw: number; fd: number }[] = [];
      if (item.wall) {
        const sides = ['n', 's', 'w', 'e'].sort(() => rnd() - 0.5);
        for (const side of sides) {
          const along = side === 'n' || side === 's' ? [ix1, ix2] : [iz1, iz2];
          const off = rnd() * 0.4;
          for (let a = along[0] + item.w / 2 + off; a <= along[1] - item.w / 2 + 0.001; a += 0.2) {
            if (side === 'n') candidates.push({ x: a, z: iz1 + item.d / 2, rot: 0, fw: item.w, fd: item.d });
            if (side === 's') candidates.push({ x: a, z: iz2 - item.d / 2, rot: Math.PI, fw: item.w, fd: item.d });
            if (side === 'w') candidates.push({ x: ix1 + item.d / 2, z: a, rot: Math.PI / 2, fw: item.d, fd: item.w });
            if (side === 'e') candidates.push({ x: ix2 - item.d / 2, z: a, rot: -Math.PI / 2, fw: item.d, fd: item.w });
          }
        }
      } else {
        const mx = (ix1 + ix2) / 2;
        const mz = (iz1 + iz2) / 2;
        const rots = ix2 - ix1 >= iz2 - iz1 ? [0, Math.PI / 2] : [Math.PI / 2, 0];
        for (let ring = 0; ring < 12; ring++)
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2;
            const x = mx + Math.cos(ang) * ring * 0.3;
            const z = mz + Math.sin(ang) * ring * 0.3;
            for (const rot of rots) {
              const sw = Math.abs(Math.sin(rot)) > 0.5;
              candidates.push({ x, z, rot, fw: sw ? item.d : item.w, fd: sw ? item.w : item.d });
            }
            if (ring === 0) break;
          }
      }
      for (const c of candidates) {
        // Frittstående møbler får litt luft rundt seg
        const pad = item.wall ? 0 : 0.35;
        if (!fits(c.x - c.fw / 2 - pad, c.z - c.fd / 2 - pad, c.x + c.fw / 2 + pad, c.z + c.fd / 2 + pad)) continue;
        const before = occ.slice();
        markRect(occ, c.x - c.fw / 2 + 0.02, c.z - c.fd / 2 + 0.02, c.x + c.fw / 2 - 0.02, c.z + c.fd / 2 - 0.02);
        if (!reachable()) {
          occ.set(before);
          continue;
        }
        place(item, c.x, c.z, c.rot, c.fw, c.fd);
        break;
      }
    }
  }

  private buildPanel(m: WallMount) {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.14), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.2 }));
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ map: textTexture(['Sikringsskap', '⚡ Trykk E'], { w: 256, h: 360, bg: '#334155', size: 36 }) }));
    door.position.z = 0.071;
    g.add(cab, door);
    g.add(this.hitbox(0.8, 1.0, 0.3, 0.14, { kind: 'panel' }));
    this.mount(g, m, 1.5, 0.14);
    this.scene.add(g);
  }

  // ------------------------------------------------------------------
  // Spillogikk
  // ------------------------------------------------------------------
  private breaker(id: string) {
    return this.state.breakers.find((b) => b.id === id)!;
  }
  room(id: string) {
    return this.state.rooms.find((r) => r.def.id === id)!;
  }

  private checkShorts(kurs: string, silent = false) {
    const b = this.breaker(kurs);
    if (!b.on) return;
    for (const r of this.state.rooms) {
      if (r.def.kurs !== kurs) continue;
      const p = power(r.spec, r.conns, r.ctrl);
      if (p.trips) {
        b.on = false;
        b.tripped = true;
        if (!silent) {
          this.state.score -= 50;
          const it = r.spec.net === 'IT';
          const what =
            p.short === 'L-N'
              ? it
                ? 'kortslutning mellom L1 og L2'
                : 'kortslutning mellom fase og nøytral'
              : p.short === 'L-PE'
                ? 'jordfeil (fase mot jord)'
                : 'feil mellom nøytral og jord';
          this.cb.onMessage(`Vernet for «${b.name}» løste ut! Det er ${what} i ${r.def.name.toLowerCase()}. (−50 poeng)`, 'danger');
        }
        return;
      }
    }
  }

  private updateLights() {
    for (const r of this.state.rooms) {
      const b = this.breaker(r.def.kurs);
      const p = b.on ? power(r.spec, r.conns, r.ctrl) : null;
      const v = this.visuals.get(r.def.id)!;
      const nLamps = Object.keys(v.lamps).length;
      for (const [id, l] of Object.entries(v.lamps)) {
        const lit = p?.loads[id]?.level ?? 0;
        l.light.intensity = (nLamps > 1 ? 6 : 9) * lit;
        l.bulb.emissiveIntensity = 3 * lit;
      }
      for (const [id, f] of Object.entries(v.floors)) {
        const on = !!p?.loads[id]?.on;
        f.light.intensity = on ? 5 : 0;
        f.shade.emissiveIntensity = on ? 1.2 : 0;
        if (f.led) f.led.emissiveIntensity = on ? 3 : 0;
      }
      for (const cd of template(r.spec).controls) {
        const cv = v.controls[cd.id];
        const st = r.ctrl[cd.id] ?? 0;
        if (!cv) continue;
        if (cd.kind === 'krone') cv.rockers.forEach((rk, i) => (rk.rotation.x = st & (1 << i) ? -0.35 : 0.35));
        else cv.rockers.forEach((rk) => (rk.rotation.x = st > 0 ? -0.35 : 0.35));
        if (cv.knob) cv.knob.rotation.y = -(st / (cd.states - 1)) * Math.PI * 1.4;
        if (cv.lens) cv.lens.emissiveIntensity = st ? 1.5 : 0;
      }
    }
    this.flash.intensity = this.state.flashlight ? FLASH_INTENSITY : 0;
  }

  private updateCompletion(silent = false) {
    for (const r of this.state.rooms) {
      const b = this.breaker(r.def.kurs);
      r.complete = checkWiring(r.spec, r.conns).correct && b.on && !b.locked;
      if (r.complete && !r.rewarded) {
        r.rewarded = true;
        if (!silent) {
          this.state.score += 100;
          this.cb.onMessage(`${r.def.name} er ferdig og riktig koblet! (+100 poeng)`, 'ok');
        }
      }
    }
    if (!this.state.won && this.state.rooms.every((r) => r.complete)) {
      this.state.won = true;
      this.state.endTime = Date.now();
      if (this.state.violations === 0) this.state.score += 200;
      this.unlock();
    }
    this.cb.onChange();
  }

  /** Brukes av sikringsskap-panelet */
  toggleBreaker(id: string) {
    const b = this.breaker(id);
    if (!b.on && b.locked) {
      this.cb.onMessage('Fjern låsen/skiltet før du slår på kursen igjen.', 'warn');
      return;
    }
    b.on = !b.on;
    if (b.on) {
      b.tripped = false;
      for (const r of this.state.rooms) if (r.def.kurs === id) r.measured = false;
      this.checkShorts(id);
      if (b.on) {
        const issues = this.state.rooms.filter((r) => r.def.kurs === id).flatMap((r) => checkWiring(r.spec, r.conns).issues.map((i) => `${r.def.name}: ${i}`));
        if (issues.length) this.cb.onMessage(`Kursen er på, men det er fortsatt feil. ${issues[0]}`, 'warn');
      }
    }
    this.updateLights();
    this.updateCompletion();
  }

  toggleLock(id: string) {
    const b = this.breaker(id);
    if (!this.needTool('las', b.locked ? 'fjerne låsen' : 'sikre kursen mot innkobling')) return;
    if (b.on && !b.locked) {
      this.cb.onMessage('Slå av kursen før du setter på lås og skilt.', 'warn');
      return;
    }
    b.locked = !b.locked;
    if (b.locked) this.cb.onMessage(`Kurs låst og merket «Arbeid pågår – må ikke slås på».`, 'ok');
    this.updateLights();
    this.updateCompletion();
  }

  setConnections(roomId: string, conns: string[]) {
    this.room(roomId).conns = conns;
    this.cb.onChange();
  }

  /** Velg verktøy fra beltet */
  setTool(t: Tool) {
    if (this.state.tool === t) return;
    this.state.tool = t;
    this.cb.onChange();
  }

  /** Avisolerer en lederende i koblingsboksen */
  strip(roomId: string, endId: string) {
    const r = this.room(roomId);
    if (!r.stripped.includes(endId)) r.stripped = [...r.stripped, endId];
    this.cb.onChange();
  }

  private needTool(t: Tool, what: string) {
    if (this.state.tool === t) return true;
    const holding = this.state.tool === 'hand' ? 'Du har ingenting i hånda' : `Du har ${toolName(this.state.tool).toLowerCase()} i hånda`;
    this.cb.onMessage(`${holding}. For å ${what} trenger du ${toolRef(t)}.`, 'warn');
    return false;
  }

  useHint() {
    this.state.hintsUsed++;
    this.state.score -= 20;
    this.cb.onChange();
  }

  closeBox() {
    this.updateLights();
    this.updateCompletion();
  }

  private interact() {
    const t = this.target?.obj;
    if (!t) return;
    if (t.kind === 'door') {
      this.toggleDoor(t.door!);
      return;
    }
    if (t.kind === 'panel') {
      if (this.state.tool !== 'hand' && this.state.tool !== 'las') {
        this.needTool('hand', 'åpne sikringsskapet');
        return;
      }
      this.unlock();
      this.cb.onOpenPanel();
      return;
    }
    const r = this.room(t.roomId!);
    const b = this.breaker(r.def.kurs);
    if (t.kind === 'switch' && t.ctrl) {
      if (!this.needTool('hand', 'betjene bryteren')) return;
      const cd = template(r.spec).controls.find((x) => x.id === t.ctrl);
      if (cd) r.ctrl = { ...r.ctrl, [cd.id]: ((r.ctrl[cd.id] ?? 0) + 1) % cd.states };
      this.checkShorts(r.def.kurs);
      this.updateLights();
      this.updateCompletion();
      return;
    }
    if (t.kind === 'socket') {
      if (!this.needTool('kontrolltester', 'teste stikkontakten')) return;
      this.testSocket(r, t.load!);
      return;
    }
    if (t.kind === 'sensor') {
      this.cb.onMessage('Bevegelsessensoren tenner lyset når noen er i rommet. Gå ut og inn igjen for å teste den.', 'info');
      return;
    }
    // Koblingsboks: mål med spenningstester, åpne med skrutrekker
    if (this.state.tool === 'tester') return this.measure();
    if (this.state.tool !== 'skrutrekker') {
      this.cb.onMessage(`Koblingsboks: mål først med ${toolRef('tester')}, og åpne den med ${toolRef('skrutrekker')}.`, 'warn');
      return;
    }
    // Sikker arbeidsrekkefølge
    if (b.on) {
      this.state.violations++;
      this.state.score -= 100;
      this.cb.onMessage('STOPP! Kursen er spenningssatt. I virkeligheten kan dette gi livsfarlig strømgjennomgang. Slå av kursen i sikringsskapet først. (−100 poeng)', 'danger');
      this.cb.onChange();
      return;
    }
    if (!b.locked) {
      this.cb.onMessage('Sikre mot innkobling først: sett lås og skilt på kursen i sikringsskapet.', 'warn');
      return;
    }
    if (!r.measured) {
      this.cb.onMessage(`Kontroller at det er spenningsløst før du åpner boksen: ta fram ${toolRef('tester')} og mål på boksen.`, 'warn');
      return;
    }
    this.unlock();
    this.cb.onOpenBox(r.def.id);
  }

  /** Kontrolltester i stikkontakten: viser spenning og om jord er tilkoblet */
  private testSocket(r: RoomState, loadId: string) {
    const b = this.breaker(r.def.kurs);
    if (!b.on) {
      this.cb.onMeasure('Ingen spenning – kursen er av.', false, '— —');
      return;
    }
    const o = power(r.spec, r.conns, r.ctrl).loads[loadId];
    const ok = !!o?.on && o.pe;
    const text = o?.on ? (o.pe ? 'Spenning og jord er i orden.' : 'Spenning, men MANGLER JORD!') : 'Ingen spenning i stikkontakten.';
    this.cb.onMeasure(text, ok, ok ? 'OK' : o?.on ? 'JORD!' : '0 V');
  }

  /** Bevegelsessensorer reagerer når spilleren er i rommet */
  private updateSensors() {
    let changed = false;
    for (const r of this.state.rooms) {
      for (const cd of template(r.spec).controls) {
        if (cd.kind !== 'pir') continue;
        const inside = this.pos.x > r.def.x1 && this.pos.x < r.def.x2 && this.pos.z > r.def.z1 && this.pos.z < r.def.z2 ? 1 : 0;
        if ((r.ctrl[cd.id] ?? 0) !== inside) {
          r.ctrl = { ...r.ctrl, [cd.id]: inside };
          this.checkShorts(r.def.kurs);
          changed = true;
        }
      }
    }
    if (changed) {
      this.updateLights();
      this.updateCompletion();
    }
  }

  private measure() {
    const t = this.target?.obj;
    if (!t || t.kind !== 'box') {
      this.cb.onMessage('Sikt på en koblingsboks for å måle med spenningstesteren.', 'info');
      return;
    }
    const r = this.room(t.roomId!);
    const b = this.breaker(r.def.kurs);
    if (b.on) {
      r.measured = false;
      this.cb.onMeasure('Kursen er spenningssatt!', false, '230 V');
    } else {
      r.measured = true;
      this.cb.onMeasure('Spenningsløst. Du kan åpne boksen.', true, '0 V');
    }
    this.cb.onChange();
  }

  setFlashlight(on: boolean) {
    this.state.flashlight = on;
    this.updateLights();
    this.cb.onChange();
  }

  // ------------------------------------------------------------------
  // Input og bevegelse
  // ------------------------------------------------------------------
  /** Starter/fortsetter spillet. Prøver å låse musepekeren; hvis nettleseren ikke tillater det, styres blikket ved å dra med musa. */
  lock() {
    this.paused = false;
    if ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches) {
      this.enterFallback();
      return;
    }
    const el = this.renderer.domElement as HTMLCanvasElement & { requestPointerLock: (o?: unknown) => Promise<void> | void };
    try {
      const p = el.requestPointerLock();
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => this.enterFallback());
    } catch {
      this.enterFallback();
    }
  }

  /** Spill uten låst musepeker (f.eks. i innebygde nettleservinduer) */
  private enterFallback() {
    if (this.paused) return;
    this.fallback = true;
    this.cb.onLockChange(true);
    this.cb.onControlMode('drag');
  }

  unlock() {
    this.paused = true;
    this.fallback = false;
    this.keys.clear();
    this.mouseDrag = null;
    if (document.pointerLockElement) document.exitPointerLock();
    this.cb.onLockChange(false);
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
    this.cb.onLockChange(this.locked || this.fallback);
  };

  private onLockError = () => this.enterFallback();

  private onMouseDown = (e: MouseEvent) => {
    if (this.paused || this.locked) return;
    this.mouseDrag = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };
  private onMouseUp = () => {
    this.mouseDrag = null;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.locked) {
      this.look(e.movementX, e.movementY);
      return;
    }
    if (this.mouseDrag && !this.paused) {
      this.look((e.clientX - this.mouseDrag.x) * 1.4, (e.clientY - this.mouseDrag.y) * 1.4);
      this.mouseDrag = { x: e.clientX, y: e.clientY };
    }
  };

  private look(dx: number, dy: number) {
    this.yaw -= dx * 0.0022;
    this.pitch -= dy * 0.0022;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  private onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    this.dragLook = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  };
  private onTouchMove = (e: TouchEvent) => {
    if (!this.dragLook) return;
    const t = e.touches[0];
    this.look((t.clientX - this.dragLook.x) * 1.6, (t.clientY - this.dragLook.y) * 1.6);
    this.dragLook = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  };
  private onTouchEnd = () => {
    this.dragLook = null;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.paused) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (e.repeat) return;
    if (k === 'e') this.interact();
    if (k === 'm') {
      // M = ta fram spenningstesteren og mål
      this.setTool('tester');
      this.measure();
    }
    const tool = TOOLS.find((x) => x.key === k);
    if (tool) this.setTool(tool.id);
    if (k === 'f') this.setFlashlight(!this.state.flashlight);
    if (k === 'escape' && this.fallback) this.unlock();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  /** Berøringsknapp «Bruk» / «Mål» */
  pressInteract() {
    if (!this.paused) this.interact();
  }
  pressMeasure() {
    if (!this.paused) this.measure();
  }

  private collides(x: number, z: number) {
    for (const c of this.colliders) {
      if (x + RADIUS > c.x1 && x - RADIUS < c.x2 && z + RADIUS > c.z1 && z - RADIUS < c.z2) return true;
    }
    return false;
  }

  private resize = () => {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.paused && !this.state.won) {
      const run = this.keys.has('shift');
      const speed = run ? 5.2 : 3;
      let f = 0;
      let r = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
      if (this.keys.has('d')) r += 1;
      if (this.keys.has('a')) r -= 1;
      // Piltastene venstre/høyre (og Q/R) snur deg, slik at man kan spille uten mus
      const turn = (this.keys.has('arrowleft') || this.keys.has('q') ? 1 : 0) - (this.keys.has('arrowright') || this.keys.has('r') ? 1 : 0);
      this.yaw += turn * 2.2 * dt + this.touchTurn * 2.2 * dt;
      f += this.touchMove.f;
      r += this.touchMove.r;
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
      // Hvilket rom står spilleren i?
      const room = this.state.rooms.find((rm) => this.pos.x > rm.def.x1 && this.pos.x < rm.def.x2 && this.pos.z > rm.def.z1 && this.pos.z < rm.def.z2);
      const name = room?.def.name ?? null;
      if (name !== this.state.currentRoom) {
        this.state.currentRoom = name;
        this.updateSensors();
        this.cb.onChange();
      }
    }
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    // Dørene svinger mykt mot ønsket stilling
    for (const d of this.doors) {
      const target = d.open ? d.openAngle : d.closedAngle;
      if (Math.abs(d.angle - target) > 0.001) {
        d.angle += Math.sign(target - d.angle) * Math.min(Math.abs(target - d.angle), dt * 4);
        d.pivot.rotation.y = d.angle;
      }
    }
    this.updateTarget();
    this.renderer.render(this.scene, this.camera);
  };

  private updateTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = REACH;
    const hits = this.raycaster.intersectObjects(this.rayTargets, false);
    // Bare det første treffet gjelder: en vegg foran stenger for alt bak den
    const obj = hits[0]?.object.userData.interact as Interactable | undefined;
    this.target = obj ? { obj } : null;
    let prompt: string | null = null;
    if (obj && !this.paused) {
      if (obj.kind === 'panel') prompt = this.state.tool === 'hand' || this.state.tool === 'las' ? 'E: Åpne sikringsskapet' : 'Sikringsskap – bruk hånda (1)';
      else if (obj.kind === 'door') prompt = `E: ${this.doors[obj.door!]?.open ? 'Lukk' : 'Åpne'} ${this.doors[obj.door!]?.front ? 'inngangsdøren' : 'døren'}`;
      else {
        const r = this.room(obj.roomId!);
        const cd = obj.ctrl ? template(r.spec).controls.find((x) => x.id === obj.ctrl) : undefined;
        const st = cd ? (r.ctrl[cd.id] ?? 0) : 0;
        if (obj.kind === 'switch' && cd && this.state.tool !== 'hand') prompt = `Bryter (${r.def.name}) – bruk hånda (1)`;
        else if (obj.kind === 'switch' && cd) {
          switch (cd.kind) {
            case 'dimmer':
              prompt = `E: ${st === cd.states - 1 ? 'Skru dimmeren av' : `Skru dimmeren til ${Math.round(((st + 1) / (cd.states - 1)) * 100)} %`}`;
              break;
            case 'krone': {
              const nx = (st + 1) % 4;
              prompt = `E: Kronebryter → vippe 1 ${nx & 1 ? 'på' : 'av'}, vippe 2 ${nx & 2 ? 'på' : 'av'}`;
              break;
            }
            case 'veksel':
              prompt = `E: Vipp ${cd.name.toLowerCase()} (står i stilling ${st + 1})`;
              break;
            default:
              prompt = `E: Slå ${cd.kind === 'topolet' ? 'den topolede bryteren' : 'bryteren'} ${st > 0 ? 'av' : 'på'}`;
          }
          prompt += ` (${r.def.name})`;
        } else if (obj.kind === 'sensor') prompt = `Bevegelsessensor (${r.def.name}) – tenner lyset når noen er i rommet`;
        else if (obj.kind === 'socket') prompt = this.state.tool === 'kontrolltester' ? `E: Test stikkontakten (${r.def.name})` : `Stikkontakt (${r.def.name}) – test med kontrolltester (7)`;
        else if (this.state.tool === 'tester') prompt = `E: Mål spenning i koblingsboksen (${r.def.name})`;
        else if (this.state.tool === 'skrutrekker') prompt = `E: Skru opp koblingsboksen (${r.def.name})`;
        else prompt = `Koblingsboks (${r.def.name}) – mål med spenningstester (3), åpne med skrutrekker (4)`;
      }
    }
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      this.cb.onPrompt(prompt);
    }
  }

  /** Gjennomsnittlig lysstyrke i bildet (0–255) – brukes til automatisk testing */
  debugBrightness(): number {
    this.renderer.render(this.scene, this.camera);
    const gl = this.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0;
    for (let i = 0; i < px.length; i += 16) sum += (px[i] + px[i + 1] + px[i + 2]) / 3;
    return sum / (px.length / 16);
  }

  /** Setter posisjon og blikk – brukes til automatisk testing */
  debugTeleport(x: number, z: number, yaw: number, pitch = 0) {
    this.pos.set(x, EYE, z);
    this.yaw = yaw;
    this.pitch = pitch;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('pointerlockerror', this.onLockError);
    document.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (document.pointerLockElement) document.exitPointerLock();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
