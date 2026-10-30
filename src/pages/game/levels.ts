// Brett for Elektrikerspillet. Mål i meter. Husene har ett plan med takhøyde 2,6 m.
import { FAULTS } from './wiring';

export type Face = 'n' | 's' | 'e' | 'w';

export interface WallMount {
  x: number;
  z: number;
  /** Retningen fronten peker (inn i rommet) */
  face: Face;
}

export interface WallDef {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  /** Døråpninger: avstand fra startpunktet til midten av døren, og bredde */
  doors?: { at: number; width: number }[];
}

export interface RoomDef {
  id: string;
  name: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  kurs: string;
  lamp: { x: number; z: number };
  switch: WallMount;
  box: WallMount;
  /** Hva som skal kobles i rommet. Standard: lys med enpolet bryter. */
  circuit?: CircuitKind;
  /** Andre bryter (trappekobling). Standard: østveggen nær sørøsthjørnet. */
  switch2?: WallMount;
  /** Stikkontakt når rommet også har lys. Standard: sørveggen nær sørvesthjørnet. */
  socket?: WallMount;
  /** Andre stikkontakt. Standard: østveggen nær nordøsthjørnet. */
  socket2?: WallMount;
  /** Koblinger som allerede finnes i boksen (f.eks. feil fra forrige montør) */
  preset?: string[];
  /** Bryterstilling når oppdraget starter */
  switchOn?: boolean;
}

/** Hva rommet inneholder: lys med bryter/dimmer/sensor, trappekobling, kronebryter eller stikkontakter */
export type CircuitKind =
  | 'lys-enpolet'
  | 'lys-topolet'
  | 'lys-dimmer'
  | 'lys-trapp'
  | 'lys-krone'
  | 'lys-sensor'
  | 'lys-stikk'
  | 'stikk-enkel'
  | 'stikk-dobbel'
  | 'stikk-ute'
  | 'stikk-usb';

/** Systemjording: TN (L, N, PE) eller IT (L1, L2, PE – begge lederne er spenningsførende) */
export type Net = 'TN' | 'IT';

export interface BreakerDef {
  id: string;
  name: string;
  on: boolean;
}

export interface LevelDef {
  id: string;
  name: string;
  customer: string;
  story: string;
  difficulty: 1 | 2 | 3;
  /** Anleggstype. Standard: TN. */
  net?: Net;
  bounds: { x1: number; z1: number; x2: number; z2: number };
  walls: WallDef[];
  rooms: RoomDef[];
  breakers: BreakerDef[];
  panel: WallMount;
  spawn: { x: number; z: number };
  /** Plassering av skiltet over inngangsdøren */
  sign: { x: number; z: number };
}

const F = FAULTS;

const rect = (x1: number, z1: number, x2: number, z2: number, frontDoor?: { at: number; width: number }): WallDef[] => [
  { x1, z1, x2, z2: z1 },
  { x1: x2, z1, x2, z2 },
  { x1, z1: z2, x2, z2, doors: frontDoor ? [frontDoor] : undefined },
  { x1, z1, x2: x1, z2 },
];

/** De tre første, håndlagde oppdragene. Hele kampanjen settes sammen i campaign.ts. */
export const BASE_LEVELS: LevelDef[] = [
  {
    id: 'hytta',
    name: 'Hytta ved vannet',
    customer: 'Familien Berg',
    story: 'Familien Berg har fått ny taklampe i stua, men ingen har koblet den til. Koble opp lampen og lysbryteren.',
    difficulty: 1,
    bounds: { x1: -3, z1: -2.5, x2: 3, z2: 2.5 },
    walls: rect(-3, -2.5, 3, 2.5, { at: 3, width: 1.0 }),
    rooms: [
      {
        id: 'stue',
        name: 'Stue',
        x1: -3,
        z1: -2.5,
        x2: 3,
        z2: 2.5,
        kurs: 'k1',
        lamp: { x: 0, z: 0 },
        switch: { x: 1.1, z: 2.5, face: 'n' },
        box: { x: 0, z: -2.5, face: 's' },
        preset: [],
        switchOn: false,
      },
    ],
    breakers: [{ id: 'k1', name: 'Kurs 1 – Stue (lys)', on: true }],
    panel: { x: -3, z: 1.4, face: 'e' },
    spawn: { x: 0, z: 7 },
    sign: { x: 0, z: 2.5 },
  },
  {
    id: 'enebolig',
    name: 'Eneboligen i Granveien',
    customer: 'Familien Hansen',
    story:
      'Hansen har hatt besøk av en «kompis som kan litt elektro». Nå er det rart med lyset: på kjøkkenet virker bryteren, men noe er galt, og på soverommet mangler noe viktig. Stua har fått ny dimmer som ikke er koblet.',
    difficulty: 2,
    bounds: { x1: -5, z1: -4, x2: 5, z2: 4 },
    walls: [
      ...rect(-5, -4, 5, 4, { at: 7.5, width: 1.0 }),
      { x1: 0, z1: -4, x2: 0, z2: 4, doors: [{ at: 2, width: 1.0 }, { at: 6, width: 1.0 }] },
      { x1: -5, z1: 0, x2: 0, z2: 0 },
    ],
    rooms: [
      {
        id: 'stue',
        name: 'Stue',
        x1: 0,
        z1: -4,
        x2: 5,
        z2: 4,
        kurs: 'k1',
        circuit: 'lys-dimmer',
        lamp: { x: 2.5, z: 0 },
        switch: { x: 3.4, z: 4, face: 'n' },
        box: { x: 2.5, z: -4, face: 's' },
        preset: [],
      },
      {
        id: 'kjokken',
        name: 'Kjøkken',
        x1: -5,
        z1: 0,
        x2: 0,
        z2: 4,
        kurs: 'k2',
        lamp: { x: -2.5, z: 2 },
        switch: { x: 0, z: 3.1, face: 'w' },
        box: { x: -2.5, z: 4, face: 'n' },
        preset: [...F['lys-enpolet'].bryterN],
        switchOn: true,
      },
      {
        id: 'soverom',
        name: 'Soverom',
        x1: -5,
        z1: -4,
        x2: 0,
        z2: 0,
        kurs: 'k3',
        lamp: { x: -2.5, z: -2 },
        switch: { x: 0, z: -0.9, face: 'w' },
        box: { x: -2.5, z: -4, face: 's' },
        preset: [...F['lys-enpolet'].manglerPE],
        switchOn: true,
      },
    ],
    breakers: [
      { id: 'k1', name: 'Kurs 1 – Stue', on: true },
      { id: 'k2', name: 'Kurs 2 – Kjøkken', on: true },
      { id: 'k3', name: 'Kurs 3 – Soverom', on: true },
    ],
    panel: { x: 5, z: 2.6, face: 'w' },
    spawn: { x: 2.5, z: 9 },
    sign: { x: 2.5, z: 4 },
  },
  {
    id: 'kontor',
    name: 'Kontorbygget',
    customer: 'Lysverket Regnskap AS',
    story:
      'Kontoret klager på lyset: sikringen til resepsjonen går hele tiden, lyset i møterommet kan ikke slås av, kontor 1 skal ha ny dobbel stikkontakt, og på lageret er det mørkt. Finn feilene og få alt til å virke.',
    difficulty: 3,
    bounds: { x1: -6, z1: -4, x2: 6, z2: 4 },
    walls: [
      ...rect(-6, -4, 6, 4, { at: 3, width: 1.2 }),
      { x1: 0, z1: -4, x2: 0, z2: 4, doors: [{ at: 2, width: 1.0 }, { at: 6, width: 1.0 }] },
      { x1: -6, z1: 0, x2: 6, z2: 0, doors: [{ at: 3, width: 1.0 }, { at: 9, width: 1.0 }] },
    ],
    rooms: [
      {
        id: 'resepsjon',
        name: 'Resepsjon',
        x1: -6,
        z1: 0,
        x2: 0,
        z2: 4,
        kurs: 'k1',
        lamp: { x: -3, z: 2 },
        switch: { x: -1.7, z: 4, face: 'n' },
        box: { x: -6, z: 2, face: 'e' },
        preset: [...F['lys-enpolet'].kortslutning],
        switchOn: true,
      },
      {
        id: 'kontor1',
        name: 'Kontor 1',
        x1: 0,
        z1: 0,
        x2: 6,
        z2: 4,
        kurs: 'k2',
        circuit: 'stikk-dobbel',
        lamp: { x: 3, z: 2 },
        switch: { x: 0, z: 3.1, face: 'e' },
        box: { x: 3, z: 4, face: 'n' },
        preset: [],
      },
      {
        id: 'moterom',
        name: 'Møterom',
        x1: -6,
        z1: -4,
        x2: 0,
        z2: 0,
        kurs: 'k3',
        lamp: { x: -3, z: -2 },
        switch: { x: -1.8, z: 0, face: 'n' },
        box: { x: -3, z: -4, face: 's' },
        preset: [...F['lys-enpolet'].alltidPa],
        switchOn: false,
      },
      {
        id: 'lager',
        name: 'Lager',
        x1: 0,
        z1: -4,
        x2: 6,
        z2: 0,
        kurs: 'k4',
        lamp: { x: 3, z: -2 },
        switch: { x: 4.2, z: 0, face: 'n' },
        box: { x: 6, z: -2, face: 'w' },
        preset: [...F['lys-enpolet'].ok],
        switchOn: true,
      },
    ],
    breakers: [
      { id: 'k1', name: 'Kurs 1 – Resepsjon', on: true },
      { id: 'k2', name: 'Kurs 2 – Kontor 1', on: true },
      { id: 'k3', name: 'Kurs 3 – Møterom', on: true },
      { id: 'k4', name: 'Kurs 4 – Lager', on: false },
    ],
    panel: { x: -4.6, z: 4, face: 'n' },
    spawn: { x: -3, z: 9 },
    sign: { x: -3, z: 4 },
  },
];
