// Kontroll av tegninger laget i de ekte ElektroStudio-verktøyene.
// Kretser sjekkes ved å simulere dem i alle relevante bryterstillinger.
import type { ComponentEl, DrawingDoc } from '../../types';
import { getSymbol } from '../../library/symbols';
import { emptySimState, simulate, type SimState } from '../../sim/solver';
import { checkDrawing } from '../../editor/CheckPanel';

export interface CheckResult {
  ok: boolean;
  /** 0–100 */
  score: number;
  feedback: string[];
}

const comps = (doc: DrawingDoc) => doc.elements.filter((e): e is ComponentEl => e.type === 'component');
const bySymbol = (doc: DrawingDoc, ...ids: string[]) => comps(doc).filter((c) => ids.includes(c.symbolId));
const count = (doc: DrawingDoc, ...ids: string[]) => bySymbol(doc, ...ids).length;

/** Felles sjekk: ledninger koblet, betegnelser satt */
function common(doc: DrawingDoc, fb: string[]): number {
  let penalty = 0;
  const issues = checkDrawing(doc);
  const loose = issues.filter((i) => i.level === 'error').length;
  if (loose) {
    fb.push(`Koblingskontrollen fant ${loose} feil (f.eks. løse ledningsender). Trykk «Kontroller» i tegneverktøyet for å se dem.`);
    penalty += 15;
  }
  const unlabeled = comps(doc).filter((c) => getSymbol(c.symbolId)?.prefix && !c.label).length;
  if (unlabeled) {
    fb.push(`${unlabeled} komponent(er) mangler referansebetegnelse (f.eks. G1, S1, E1).`);
    penalty += 10;
  }
  return penalty;
}

function lampsLit(doc: DrawingDoc, st: SimState) {
  const r = simulate(doc.elements, st);
  return { r, lit: bySymbol(doc, 'lamp').map((l) => (r.visual[l.id]?.level ?? 0) > 0.05) };
}

export const CHECKERS: Record<string, (doc: DrawingDoc) => CheckResult> = {
  /** Strømkilde + bryter + lampe. Lampen skal lyse bare når bryteren er lukket. */
  lampeBryter(doc) {
    const fb: string[] = [];
    const src = bySymbol(doc, 'dc-source');
    const sw = bySymbol(doc, 'switch-no');
    const lamps = bySymbol(doc, 'lamp');
    if (!src.length) fb.push('Skjemaet mangler en strømkilde (likespenning).');
    if (!sw.length) fb.push('Skjemaet mangler en bryter (sluttekontakt).');
    if (!lamps.length) fb.push('Skjemaet mangler en lampe.');
    if (fb.length) return { ok: false, score: 0, feedback: fb };
    const off = lampsLit(doc, { ...emptySimState(), switches: Object.fromEntries(sw.map((s) => [s.id, false])) });
    const on = lampsLit(doc, { ...emptySimState(), switches: Object.fromEntries(sw.map((s) => [s.id, true])) });
    if (on.r.messages.some((m) => m.level === 'error')) fb.push('Simuleringen melder feil: ' + on.r.messages.filter((m) => m.level === 'error').map((m) => m.text).join(' '));
    if (!on.lit.some(Boolean)) fb.push('Lampen lyser ikke når bryteren er lukket. Sjekk at kretsen er lukket fra pluss, gjennom bryteren og lampen, og tilbake til minus.');
    if (off.lit.some(Boolean)) fb.push('Lampen lyser selv når bryteren er åpen – bryteren er ikke koblet i serie med lampen.');
    const penalty = common(doc, fb);
    const ok = on.lit.some(Boolean) && !off.lit.some(Boolean);
    return { ok, score: ok ? Math.max(60, 100 - penalty) : 20, feedback: ok && fb.length === 0 ? ['Kretsen virker: lampen lyser når bryteren lukkes, og slukker når den åpnes.'] : fb };
  },

  /** Strømkilde + trykknapp + ringeklokke. Klokka skal ringe bare mens knappen holdes inne. */
  ringeklokke(doc) {
    const fb: string[] = [];
    const src = bySymbol(doc, 'dc-source');
    const pb = bySymbol(doc, 'pushbutton-no');
    const bells = bySymbol(doc, 'bell');
    if (!src.length) fb.push('Kretsen mangler strømkilde (bruk likespenning, f.eks. 12 V som fra en ringetransformator).');
    if (!pb.length) fb.push('Kretsen mangler trykknapp (slutte).');
    if (!bells.length) fb.push('Kretsen mangler ringeklokke.');
    if (fb.length) return { ok: false, score: 0, feedback: fb };
    const rings = (pressed: boolean) => {
      const r = simulate(doc.elements, { ...emptySimState(), pressed: Object.fromEntries(pb.map((p) => [p.id, pressed])) });
      return bells.some((b) => (r.visual[b.id]?.level ?? 0) > 0);
    };
    const on = rings(true);
    const off = rings(false);
    if (!on) fb.push('Klokka ringer ikke når trykknappen holdes inne. Sjekk at kretsen er sluttet gjennom knappen og klokka.');
    if (off) fb.push('Klokka ringer hele tiden – trykknappen er ikke koblet inn i kretsen.');
    const penalty = common(doc, fb);
    const ok = on && !off;
    return { ok, score: ok ? Math.max(60, 100 - penalty) : 20, feedback: ok && fb.length === 0 ? ['Det ringer når knappen trykkes inn, og stopper når den slippes. Perfekt!'] : fb };
  },

  /** Trappekobling: lampen skal skifte tilstand når hvilken som helst av de to vekselbryterne vippes. */
  trappeskjema(doc) {
    const fb: string[] = [];
    const ch = bySymbol(doc, 'changeover');
    if (!bySymbol(doc, 'dc-source').length) fb.push('Skjemaet mangler strømkilde.');
    if (ch.length < 2) fb.push('Trappekobling trenger to vekselbrytere.');
    if (!bySymbol(doc, 'lamp').length) fb.push('Skjemaet mangler lampe.');
    if (fb.length) return { ok: false, score: 0, feedback: fb };
    const [a, b] = ch;
    const lit = (pa: boolean, pb: boolean) => lampsLit(doc, { ...emptySimState(), switches: { [a.id]: pa, [b.id]: pb } }).lit.some(Boolean);
    const s = [lit(false, false), lit(true, false), lit(false, true), lit(true, true)];
    const toggles = s[0] !== s[1] && s[0] !== s[2] && s[1] !== s[3] && s[2] !== s[3];
    if (!toggles) fb.push('Lampen kan ikke slås av og på fra begge bryterne. Fasen skal til fellesklemmen (C) på den ene bryteren, og klemme 1 og 2 kobles mellom bryterne.');
    const penalty = common(doc, fb);
    return { ok: toggles, score: toggles ? Math.max(60, 100 - penalty) : 20, feedback: toggles && fb.length === 0 ? ['Trappekoblingen virker fra begge steder.'] : fb };
  },

  /** Styrestrøm med selvhold: START trekker K1, K1 holder seg selv, STOPP slipper. */
  selvholdskjema(doc) {
    const fb: string[] = [];
    const start = bySymbol(doc, 'pushbutton-no');
    const stop = bySymbol(doc, 'pushbutton-nc');
    const coils = bySymbol(doc, 'relay-coil', 'contactor-coil');
    const contacts = bySymbol(doc, 'relay-no');
    if (!bySymbol(doc, 'dc-source').length) fb.push('Skjemaet mangler strømkilde.');
    if (!start.length) fb.push('Mangler START-knapp (trykknapp slutte).');
    if (!stop.length) fb.push('Mangler STOPP-knapp (trykknapp bryte).');
    if (!coils.length) fb.push('Mangler spole (relé eller kontaktor).');
    if (!contacts.length) fb.push('Mangler selvholdskontakt (relékontakt slutte med samme betegnelse som spolen).');
    if (fb.length) return { ok: false, score: 0, feedback: fb };
    const coil = coils[0];
    let st: SimState = emptySimState();
    const step = (pressed: Record<string, boolean>) => {
      const r = simulate(doc.elements, { ...st, pressed });
      st = { ...st, coils: r.coils, tripped: r.tripped };
      return !!r.visual[coil.id]?.energized;
    };
    const idle = step({});
    const pressStart = step(Object.fromEntries(start.map((s) => [s.id, true])));
    const afterRelease = step({});
    const pressStop = step(Object.fromEntries(stop.map((s) => [s.id, true])));
    const afterStop = step({});
    if (idle) fb.push('Spolen trekker uten at START er trykket.');
    if (!pressStart) fb.push('Spolen trekker ikke når START trykkes.');
    else if (!afterRelease) fb.push('Spolen faller når START slippes – selvholdskontakten må kobles i parallell med START-knappen, og ha samme betegnelse som spolen.');
    if (afterRelease && (pressStop || afterStop)) fb.push('STOPP slipper ikke spolen – STOPP-knappen (bryte) må stå i serie før START og selvholdet.');
    const ok = !idle && pressStart && afterRelease && !pressStop && !afterStop;
    const penalty = common(doc, fb);
    return { ok, score: ok ? Math.max(60, 100 - penalty) : 20, feedback: ok && fb.length === 0 ? ['Selvholdet virker: START trekker, spolen holder seg selv, og STOPP slipper.'] : fb };
  },

  /** Plantegning for en liten bolig */
  husplan(doc) {
    const fb: string[] = [];
    const rooms = doc.elements.filter((e) => e.type === 'rect' && e.roomName !== undefined).length;
    const need: [string, number, string[]][] = [
      ['rom (bruk Rom-verktøyet)', 3, []],
      ['lampepunkter', 3, ['plan-lamp', 'plan-downlight']],
      ['lysbrytere', 3, ['plan-switch', 'plan-motion']],
      ['stikkontakter', 5, ['plan-socket']],
      ['koblingsbokser', 1, ['plan-junction-box']],
      ['fordelingstavle', 1, ['plan-panel']],
    ];
    let missing = 0;
    for (const [name, n, ids] of need) {
      const have = ids.length ? count(doc, ...ids) : rooms;
      if (have < n) {
        fb.push(`For få ${name}: ${have} av minst ${n}.`);
        missing++;
      }
    }
    const cables = doc.elements.filter((e) => e.type === 'wire' && e.kind === 'cable').length;
    if (cables < 2) {
      fb.push(`Tegn kabelruter (Kabelrute-verktøyet) fra fordelingen ut til rommene: ${cables} av minst 2.`);
      missing++;
    }
    const ok = missing === 0;
    return { ok, score: ok ? 100 : Math.max(0, 80 - missing * 15), feedback: ok ? ['Planen har rom, lys, brytere, stikkontakter, koblingsboks, fordeling og kabelruter.'] : fb };
  },
};
