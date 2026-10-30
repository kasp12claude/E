// Hele kampanjen: tre håndlagde oppdrag + 17 oppdrag bygd med rutenett-hjelperen under.
import { BASE_LEVELS, type BreakerDef, type CircuitKind, type LevelDef, type Net, type RoomDef, type WallDef } from './levels';
import { FAULTS } from './wiring';

// ---------------------------------------------------------------------------
// Rutenett-hus: cols × rows rom, dør mellom alle naborom og inngangsdør i sør
// ---------------------------------------------------------------------------
interface GridRoom {
  name: string;
  /** Hva rommet inneholder. Standard: lys med enpolet bryter (TN) / topolet bryter (IT). */
  circuit?: CircuitKind;
  /** Navn på en ferdig feil for kretstypen (se FAULTS i wiring.ts) */
  fault: string;
  switchOn?: boolean;
  /** Kurs-id; rom med samme id deler sikring. Standard: egen kurs per rom. */
  kurs?: string;
}

interface GridLevel {
  id: string;
  name: string;
  customer: string;
  story: string;
  difficulty: 1 | 2 | 3;
  net?: Net;
  cols: number;
  rows: number;
  cellW: number;
  cellD: number;
  /** Hvilken kolonne inngangsdøren er i (rommene i nederste rad vender mot gata) */
  frontCol?: number;
  /** Rom radvis fra bakerst (nord) til fremst (sør), venstre mot høyre */
  rooms: GridRoom[];
  /** Overstyr navn/stilling på kurser, f.eks. feilmerking eller kurs som er av */
  breakers?: Record<string, Partial<Omit<BreakerDef, 'id'>>>;
}

const DOOR = 1.0;

function gridLevel(o: GridLevel): LevelDef {
  const W = o.cols * o.cellW;
  const D = o.rows * o.cellD;
  const x1 = -W / 2;
  const z1 = -D / 2;
  const x2 = W / 2;
  const z2 = D / 2;
  const frontCol = o.frontCol ?? Math.floor((o.cols - 1) / 2);
  const doorX = x1 + (frontCol + 0.5) * o.cellW;
  const net = o.net ?? 'TN';

  const walls: WallDef[] = [
    { x1, z1, x2, z2: z1 },
    { x1: x2, z1, x2, z2 },
    { x1, z1: z2, x2, z2, doors: [{ at: doorX - x1, width: 1.0 }] },
    { x1, z1, x2: x1, z2 },
  ];
  for (let c = 1; c < o.cols; c++) {
    const x = x1 + c * o.cellW;
    walls.push({ x1: x, z1, x2: x, z2, doors: Array.from({ length: o.rows }, (_, r) => ({ at: (r + 0.5) * o.cellD, width: DOOR })) });
  }
  for (let r = 1; r < o.rows; r++) {
    const z = z1 + r * o.cellD;
    walls.push({ x1, z1: z, x2, z2: z, doors: Array.from({ length: o.cols }, (_, c) => ({ at: (c + 0.5) * o.cellW, width: DOOR })) });
  }

  if (o.rooms.length !== o.cols * o.rows) throw new Error(`Oppdrag ${o.id}: ${o.rooms.length} rom, men rutenettet har ${o.cols * o.rows}`);
  const rooms: RoomDef[] = o.rooms.map((g, i) => {
    const c = i % o.cols;
    const r = Math.floor(i / o.cols);
    const rx1 = x1 + c * o.cellW;
    const rz1 = z1 + r * o.cellD;
    const cx = rx1 + o.cellW / 2;
    const cz = rz1 + o.cellD / 2;
    const circuit: CircuitKind = g.circuit ?? (net === 'IT' ? 'lys-topolet' : 'lys-enpolet');
    const preset = FAULTS[circuit][g.fault];
    if (!preset) throw new Error(`Oppdrag ${o.id}: ukjent feil «${g.fault}» for ${circuit}`);
    return {
      id: `r${i + 1}`,
      name: g.name,
      x1: rx1,
      z1: rz1,
      x2: rx1 + o.cellW,
      z2: rz1 + o.cellD,
      kurs: g.kurs ?? `k${i + 1}`,
      circuit,
      lamp: { x: cx, z: cz },
      // Bryter/stikkontakt på vestveggen nær nordvesthjørnet, boks på nordveggen – unna dørene midt på veggene
      switch: { x: rx1, z: rz1 + 0.6, face: 'e' },
      box: { x: cx + o.cellW / 4, z: rz1, face: 's' },
      preset: [...preset],
      switchOn: g.switchOn ?? g.fault !== 'tom',
    };
  });

  // Én kurs per unik kurs-id, i rekkefølgen de første gang brukes
  const breakers: BreakerDef[] = [];
  for (const rm of rooms) {
    if (breakers.some((b) => b.id === rm.kurs)) continue;
    const names = rooms.filter((x) => x.kurs === rm.kurs).map((x) => x.name);
    const n = breakers.length + 1;
    breakers.push({ id: rm.kurs, name: `Kurs ${n} – ${names.join(' + ')}`, on: true, ...(o.breakers?.[rm.kurs] ?? {}) });
  }

  return {
    id: o.id,
    name: o.name,
    customer: o.customer,
    story: o.story,
    difficulty: o.difficulty,
    net,
    bounds: { x1, z1, x2, z2 },
    walls,
    rooms,
    breakers,
    panel: { x: doorX + Math.min(1.0, o.cellW / 2 - 0.5), z: z2, face: 'n' },
    spawn: { x: doorX, z: z2 + 4.5 },
    sign: { x: doorX, z: z2 },
  };
}

// ---------------------------------------------------------------------------
// Oppdrag 4–20
// ---------------------------------------------------------------------------
const MORE: GridLevel[] = [
  {
    id: 'garasjen',
    name: 'Garasjen',
    customer: 'Ola Nordby',
    story: 'Ola har bygd garasje med verksted og bod. Verkstedet har fått ny taklampe som ikke er koblet, og stikkontakten i boden mangler noe viktig. Test den med kontrolltesteren.',
    difficulty: 1,
    cols: 2,
    rows: 1,
    cellW: 4,
    cellD: 4,
    frontCol: 0,
    rooms: [
      { name: 'Verksted', fault: 'tom' },
      { name: 'Bod', circuit: 'stikk-enkel', fault: 'manglerPE' },
    ],
  },
  {
    id: 'leiligheten',
    name: 'Leiligheten i 3. etasje',
    customer: 'Sara Lien',
    story: 'Sara har fått dimmer i stua, men lyset virker ikke. På soverommet skal det monteres en ny dobbel stikkontakt.',
    difficulty: 1,
    cols: 2,
    rows: 1,
    cellW: 4.5,
    cellD: 4,
    frontCol: 0,
    rooms: [
      { name: 'Stue', circuit: 'lys-dimmer', fault: 'byttet' },
      { name: 'Soverom', circuit: 'stikk-dobbel', fault: 'tom' },
    ],
  },
  {
    id: 'stabburet',
    name: 'Stabburet på tunet',
    customer: 'Familien Haugen',
    story: 'Det gamle stabburet har IT-anlegg med topolede brytere. Lyset på loftet kan slås av, men bryteren bryter bare én leder. Gjesterommet har en stikkontakt på en kurs som er av.',
    difficulty: 1,
    net: 'IT',
    cols: 1,
    rows: 2,
    cellW: 5,
    cellD: 3.5,
    rooms: [
      { name: 'Loft', fault: 'enPol' },
      { name: 'Gjesterom', circuit: 'stikk-enkel', fault: 'ok', kurs: 'k2' },
    ],
    breakers: { k2: { on: false } },
  },
  {
    id: 'barnehagen',
    name: 'Barnehagen Solsikken',
    customer: 'Styrer Kari Moe',
    story: 'Hvilerommet har fått dimmer, lyset på stellerommet kan ikke slås av, og i garderoben virker bare det ene uttaket i den doble stikkontakten.',
    difficulty: 1,
    cols: 2,
    rows: 2,
    cellW: 4.5,
    cellD: 4,
    rooms: [
      { name: 'Lekerom', fault: 'ok' },
      { name: 'Hvilerom', circuit: 'lys-dimmer', fault: 'tom' },
      { name: 'Stellerom', fault: 'alltidPa', switchOn: false },
      { name: 'Garderobe', circuit: 'stikk-dobbel', fault: 'nr2Uten' },
    ],
  },
  {
    id: 'rekkehuset',
    name: 'Rekkehuset i Furulia',
    customer: 'Familien Ahmadi',
    story: 'Familien Ahmadi har pusset opp. På kjøkkenet virker stikkontakten bare når taklyset er på. Gangen skal ha trappekobling med bryter i hver ende, og hjemmekontoret skal ha stikkontakt med USB-lader.',
    difficulty: 2,
    cols: 3,
    rows: 1,
    cellW: 4,
    cellD: 4.5,
    frontCol: 1,
    rooms: [
      { name: 'Kjøkken', circuit: 'lys-stikk', fault: 'stikkPaBryter' },
      { name: 'Gang', circuit: 'lys-trapp', fault: 'tom' },
      { name: 'Hjemmekontor', circuit: 'stikk-usb', fault: 'tom' },
    ],
  },
  {
    id: 'fjellhytta',
    name: 'Fjellhytta',
    customer: 'Turlaget',
    story: 'Turlagets hytte har IT-anlegg og har stått tom hele vinteren. Kursene er slått av, og en hyttegjest har «fikset» lyset i peisestua slik at det alltid er på.',
    difficulty: 2,
    net: 'IT',
    cols: 2,
    rows: 1,
    cellW: 5,
    cellD: 4.5,
    frontCol: 1,
    rooms: [
      { name: 'Peisestue', fault: 'alltidPa', switchOn: false },
      { name: 'Sovealkove', circuit: 'stikk-enkel', fault: 'ok' },
    ],
    breakers: { k1: { on: false }, k2: { on: false } },
  },
  {
    id: 'bakeriet',
    name: 'Bakeriet',
    customer: 'Bakermester Jensen',
    story: 'Butikk og bakerom deler kurs, og vernet løser ut hver morgen. På lageret mangler jord på det ene uttaket, og kontoret har fått ny dimmer.',
    difficulty: 2,
    cols: 2,
    rows: 2,
    cellW: 4.5,
    cellD: 4,
    rooms: [
      { name: 'Lager', circuit: 'stikk-dobbel', fault: 'nr2ManglerPE' },
      { name: 'Kontor', circuit: 'lys-dimmer', fault: 'tom' },
      { name: 'Bakerom', fault: 'kortslutning', kurs: 'felles' },
      { name: 'Butikk', circuit: 'lys-krone', fault: 'ok', kurs: 'felles' },
    ],
  },
  {
    id: 'frisoren',
    name: 'Frisørsalongen',
    customer: 'Salong Lokken',
    story: 'Salongen har kronebryter med to lamper, men vippene gjør helt rare ting. Vaskerommet skal få ny stikkontakt.',
    difficulty: 2,
    cols: 2,
    rows: 1,
    cellW: 5,
    cellD: 4.5,
    frontCol: 0,
    rooms: [
      { name: 'Salong', circuit: 'lys-krone', fault: 'fellesFeil' },
      { name: 'Vaskerom', circuit: 'stikk-enkel', fault: 'tom' },
    ],
  },
  {
    id: 'skolen',
    name: 'Skolen – 2. etasje',
    customer: 'Vaktmester Berit',
    story: 'Seks rom: kronebryter der begge lampene følger samme vippe, trappekobling i korridoren som bare virker i noen stillinger, dimmer, og en USB-stikkontakt uten strøm. Finn alle feilene.',
    difficulty: 2,
    cols: 3,
    rows: 2,
    cellW: 4.5,
    cellD: 4.5,
    frontCol: 1,
    rooms: [
      { name: 'Klasserom A', circuit: 'lys-krone', fault: 'sammeVippe' },
      { name: 'Klasserom B', circuit: 'stikk-dobbel', fault: 'ok' },
      { name: 'Klasserom C', fault: 'alltidPa', switchOn: false },
      { name: 'Grupperom', circuit: 'lys-dimmer', fault: 'tom' },
      { name: 'Korridor', circuit: 'lys-trapp', fault: 'enKorr' },
      { name: 'Lærerrom', circuit: 'stikk-usb', fault: 'manglerN' },
    ],
  },
  {
    id: 'laven',
    name: 'Låven på gården',
    customer: 'Bonde Rognstad',
    story: 'Låven har IT-anlegg. Vernet på høyloftet løser ut, fjøsbryteren bryter bare én leder, og utestikkontakten i melkerommet har jordfeil. I IT-anlegg løser ikke vernet nødvendigvis ut ved første jordfeil – du må finne den selv.',
    difficulty: 2,
    net: 'IT',
    cols: 2,
    rows: 2,
    cellW: 5,
    cellD: 4.5,
    rooms: [
      { name: 'Høyloft', fault: 'kortslutning', kurs: 'lave' },
      { name: 'Redskapsrom', circuit: 'stikk-enkel', fault: 'ok', kurs: 'lave' },
      { name: 'Fjøs', fault: 'polerKrysset' },
      { name: 'Melkerom', circuit: 'stikk-ute', fault: 'jordfeil' },
    ],
    breakers: { k3: { on: false } },
  },
  {
    id: 'tannlegen',
    name: 'Tannlegekontoret',
    customer: 'Tannlege Hval',
    story: 'Advarsel fra kunden: merkingen i sikringsskapet ble laget av forrige eier og stemmer kanskje ikke. Mål alltid før du åpner en boks!',
    difficulty: 3,
    cols: 3,
    rows: 1,
    cellW: 4,
    cellD: 4.5,
    frontCol: 1,
    rooms: [
      { name: 'Behandlingsrom', circuit: 'lys-dimmer', fault: 'iN' },
      { name: 'Venterom', circuit: 'lys-sensor', fault: 'manglerN' },
      { name: 'Sterilrom', circuit: 'stikk-dobbel', fault: 'nr2ManglerPE' },
    ],
    // Merkingen er feil: kurs 1 og 3 har byttet navn
    breakers: { k1: { name: 'Kurs 1 – Sterilrom' }, k3: { name: 'Kurs 3 – Behandlingsrom' } },
  },
  {
    id: 'biblioteket',
    name: 'Biblioteket',
    customer: 'Bibliotekar Nils',
    story: 'Magasinet skal ha lys med bevegelsessensor, lesesalen kronebryter og barneavdelingen to stikkontakter. Trappekoblingen i garderoben er feil, og i skranken lyser lyset hele tiden.',
    difficulty: 3,
    cols: 3,
    rows: 2,
    cellW: 4.5,
    cellD: 4.5,
    frontCol: 1,
    rooms: [
      { name: 'Magasin', circuit: 'lys-sensor', fault: 'tom' },
      { name: 'Lesesal', circuit: 'lys-krone', fault: 'tom' },
      { name: 'Barneavdeling', circuit: 'stikk-dobbel', fault: 'tom' },
      { name: 'Kontor', circuit: 'lys-stikk', fault: 'bryterN' },
      { name: 'Skranke', fault: 'alltidPa', switchOn: false },
      { name: 'Garderobe', circuit: 'lys-trapp', fault: 'fellesFeil' },
    ],
  },
  {
    id: 'hotellet',
    name: 'Hotell Fjordglimt',
    customer: 'Hotellsjef Ruud',
    story: 'Tre hotellrom deler kurs, og vernet løser ut. Skapet er merket av en vikar, og navnene kan være byttet. Gjestene kommer i kveld!',
    difficulty: 3,
    cols: 3,
    rows: 2,
    cellW: 4.5,
    cellD: 4,
    frontCol: 1,
    rooms: [
      { name: 'Rom 101', circuit: 'lys-dimmer', fault: 'ok', kurs: 'rom' },
      { name: 'Rom 102', circuit: 'lys-stikk', fault: 'kortslutning', kurs: 'rom' },
      { name: 'Rom 103', circuit: 'stikk-usb', fault: 'manglerPE', kurs: 'rom' },
      { name: 'Frokostsal', circuit: 'lys-krone', fault: 'mangler2N' },
      { name: 'Resepsjon', circuit: 'lys-trapp', fault: 'tom' },
      { name: 'Kjøkken', circuit: 'stikk-enkel', fault: 'jordfeil' },
    ],
    // Feilmerket: kurs 2 og 4 har byttet navn
    breakers: { k4: { name: 'Kurs 2 – Kjøkken' }, k6: { name: 'Kurs 4 – Frokostsal' } },
  },
  {
    id: 'sykehjemmet',
    name: 'Sykehjemmet',
    customer: 'Avdelingsleder Ingrid',
    story: 'Avdelingen har IT-anlegg med topolede brytere. Nattevakten melder om flere feil. Beboerne sover, så du må jobbe rolig og trygt – og få alt til å virke igjen.',
    difficulty: 3,
    net: 'IT',
    cols: 3,
    rows: 2,
    cellW: 4.5,
    cellD: 4.5,
    frontCol: 1,
    rooms: [
      { name: 'Beboerrom 1', fault: 'alltidPa', switchOn: false },
      { name: 'Beboerrom 2', fault: 'manglerPE' },
      { name: 'Beboerrom 3', fault: 'enPol' },
      { name: 'Dagligstue', fault: 'kortslutning' },
      { name: 'Vaktrom', circuit: 'stikk-dobbel', fault: 'nr2Uten' },
      { name: 'Medisinrom', circuit: 'stikk-enkel', fault: 'manglerPE' },
    ],
  },
  {
    id: 'kontorlandskap',
    name: 'Kontorlandskapet',
    customer: 'Firmaet Nordlys Data',
    story: 'Åtte rom, mange feil og et sikringsskap der noen kurser står av. Planlegg rekkefølgen, og husk lås og måling for hver kurs.',
    difficulty: 3,
    cols: 4,
    rows: 2,
    cellW: 4,
    cellD: 4,
    frontCol: 1,
    rooms: [
      { name: 'Serverrom', circuit: 'stikk-dobbel', fault: 'nr2ManglerPE' },
      { name: 'Møterom', circuit: 'lys-krone', fault: 'bareEn' },
      { name: 'Kontor A', circuit: 'stikk-usb', fault: 'tom' },
      { name: 'Kontor B', circuit: 'lys-sensor', fault: 'byttet' },
      { name: 'Kantine', circuit: 'lys-stikk', fault: 'stikkManglerPE' },
      { name: 'Resepsjon', fault: 'ok' },
      { name: 'Kopirom', fault: 'byttet' },
      { name: 'Toalett', circuit: 'lys-sensor', fault: 'tom' },
    ],
    breakers: { k6: { on: false }, k3: { on: false } },
  },
  {
    id: 'idrettshallen',
    name: 'Idrettshallen',
    customer: 'Idrettslaget Sprint',
    story: 'Hallen har trappekobling og deler kurs med damegarderoben – vernet løser ut. Tribunelyset med dimmer mangler jord, og sensoren i herregarderoben slukker aldri lyset. Kampen starter om en time.',
    difficulty: 3,
    cols: 2,
    rows: 2,
    cellW: 7,
    cellD: 6,
    rooms: [
      { name: 'Hall', circuit: 'lys-trapp', fault: 'kortslutning', kurs: 'hall' },
      { name: 'Tribune', circuit: 'lys-dimmer', fault: 'manglerPE' },
      { name: 'Garderobe dame', circuit: 'stikk-ute', fault: 'jordfeil', kurs: 'hall' },
      { name: 'Garderobe herre', circuit: 'lys-sensor', fault: 'alltidPa' },
    ],
  },
  {
    id: 'mesterproven',
    name: 'Mesterprøven',
    customer: 'Sensor fra prøvenemnda',
    story:
      'Den endelige prøven: trappekoblinger, kronebryter, sensor, dimmer og bokser med både lys og stikkontakt – med nesten alle feiltypene du har møtt. Merkingen i skapet er feil, to rom deler kurs, og det finnes ingen hint.',
    difficulty: 3,
    cols: 4,
    rows: 2,
    cellW: 4,
    cellD: 4.5,
    frontCol: 2,
    rooms: [
      { name: 'Verksted', circuit: 'lys-stikk', fault: 'kortslutning' },
      { name: 'Lager', circuit: 'lys-trapp', fault: 'fellesFeil' },
      { name: 'Laboratorium', circuit: 'lys-krone', fault: 'sammeVippe' },
      { name: 'Arkiv', circuit: 'lys-dimmer', fault: 'iN' },
      { name: 'Kantine', circuit: 'lys-sensor', fault: 'manglerN', kurs: 'felles' },
      { name: 'Kjøkken', fault: 'bryterN', kurs: 'felles' },
      { name: 'Foajé', circuit: 'lys-trapp', fault: 'bryterN' },
      { name: 'Kontor', circuit: 'stikk-usb', fault: 'tom' },
    ],
    breakers: {
      k1: { name: 'Kurs 1 – Arkiv' },
      k4: { name: 'Kurs 4 – Verksted' },
      k2: { name: 'Kurs 2 – Kontor' },
      k8: { name: 'Kurs 7 – Lager' },
    },
  },
];

/** Alle oppdrag, sortert etter vanskelighetsgrad (stabil sortering beholder rekkefølgen innen hvert nivå) */
export const LEVELS: LevelDef[] = [...BASE_LEVELS, ...MORE.map(gridLevel)].sort((a, b) => a.difficulty - b.difficulty);

export const DIFFICULTY_NAME: Record<1 | 2 | 3, string> = {
  1: 'Lærling',
  2: 'Montør',
  3: 'Mester',
};
