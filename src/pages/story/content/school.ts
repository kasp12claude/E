// Skoleregler i Story Mode: fag, karakterer, stryk og nye forsøk.
// Merk: dette er spillregler. De beskriver ikke de faktiske reglene for vurdering i videregående opplæring.
import type { Scene, Subject } from '../types';

export const SUBJECTS: { id: Subject; name: string; short: string }[] = [
  { id: 'yff', name: 'Yrkesfaglig fordypning (YFF)', short: 'YFF' },
  { id: 'elkretser', name: 'Elektriske kretser', short: 'El-kretser' },
  { id: 'styresystemer', name: 'Styresystemer', short: 'Styresystemer' },
];

/** Hvilket fag hvert skoleoppdrag gir karakter i */
export const SUBJECT_OF: Record<string, Subject> = {
  // Vg1
  k1_verktoy: 'yff',
  k1_hms: 'yff',
  k1_hmsprove: 'yff',
  k1_risiko: 'yff',
  k1_symboler: 'elkretser',
  k1_lampeskjema: 'elkretser',
  k1_ohm: 'elkretser',
  k1_feil: 'elkretser',
  k1_ringeklokke: 'styresystemer',
  k1_styring: 'styresystemer',
  // Vg2
  k2_materialer: 'yff',
  k2_risiko: 'yff',
  k2_trapp: 'elkretser',
  k2_husplan: 'elkretser',
  k2_effekt: 'elkretser',
  k2_motorteori: 'styresystemer',
  k2_selvhold_skjema: 'styresystemer',
  k2_motorfeil: 'styresystemer',
};

/** Skoleår med karakterer: 1 i et fag betyr at året må tas på nytt */
export const GRADED_CHAPTERS = ['k1', 'k2'];
/** Fagprøven: ett ikke godkjent hovedoppdrag betyr at prøven må tas på nytt */
export const EXAM_CHAPTERS = ['k5'];

/** Karakter ut fra resultat i prosent */
export function gradeFromScore(score: number): number {
  if (score >= 92) return 6;
  if (score >= 77) return 5;
  if (score >= 60) return 4;
  if (score >= 45) return 3;
  if (score >= 25) return 2;
  return 1;
}

export const RETAKE_SCENES: Scene[] = [
  {
    id: 'stryk_k1',
    title: 'Karakterkortet',
    location: 'skole',
    main: true,
    repeatable: true,
    start: 'a',
    nodes: [
      { id: 'a', speaker: 'trond', mood: 'bekymret', text: 'Sett deg ned litt. Jeg har karakterkortet ditt her. Du har fått 1 i minst ett fag – og da kan du ikke gå videre til Vg2 i år.', next: 'b' },
      { id: 'b', speaker: 'trond', text: 'Det betyr at du må ta Vg1 på nytt neste skoleår. Du blir ett år eldre enn de andre i klassen.', choices: [
        { text: 'Det er urettferdig!', next: 'c', effects: { relations: { trond: -1 } } },
        { text: 'Jeg skjønner. Hva bør jeg gjøre annerledes?', next: 'd', effects: { relations: { trond: 1 } } },
      ] },
      { id: 'c', speaker: 'trond', text: 'Jeg forstår at du er skuffet. Men karakteren viser hva du kunne da du leverte. Neste år har du et forsprang – du har sett alt én gang før.', next: 'e' },
      { id: 'd', speaker: 'trond', mood: 'glad', text: 'Følg godt med i timene, les notatene før du leverer, og spør når du er usikker. Du har bare ett forsøk på hver oppgave – så bruk tiden.', next: 'e' },
      { id: 'e', speaker: 'forteller', text: 'Sommeren går. Jonas og Amina begynner på Vg2, mens du starter på nytt i en ny Vg1-klasse – ett år eldre enn de andre.', effects: { journal: 'Fikk 1 i et fag og må ta Vg1 på nytt.' }, end: 'done' },
    ],
  },
  {
    id: 'stryk_k2',
    title: 'Karakterkortet',
    location: 'skole',
    main: true,
    repeatable: true,
    start: 'a',
    nodes: [
      { id: 'a', speaker: 'ivar', mood: 'streng', text: 'Jeg skal ikke pakke det inn: du har fått 1 i minst ett fag. Da får du ikke gå ut i lære i år.', next: 'b' },
      { id: 'b', speaker: 'ivar', text: 'Du må ta Vg2 på nytt. Det er tungt, men mange som har gjort det, blir gode fagfolk. Det handler om hva du gjør nå.', choices: [
        { text: 'Jeg skal jobbe hardere neste år.', next: 'c', effects: { relations: { ivar: 1 } } },
        { text: 'Kan ikke bedriften ta meg inn likevel?', next: 'd' },
      ] },
      { id: 'c', speaker: 'ivar', text: 'Bra. Hør etter i timene, og les gjennom oppgaven før du leverer.', next: 'e' },
      { id: 'd', speaker: 'ivar', text: 'Ikke i dette spillet. Du må ha bestått skoleåret først.', next: 'e' },
      { id: 'e', speaker: 'forteller', text: 'Et nytt skoleår begynner. Du tar Vg2 på nytt i en ny klasse.', effects: { journal: 'Fikk 1 i et fag og må ta Vg2 på nytt.' }, end: 'done' },
    ],
  },
  {
    id: 'stryk_k5',
    title: 'Resultatet fra prøvenemnda',
    location: 'provested',
    main: true,
    repeatable: true,
    start: 'a',
    nodes: [
      { id: 'a', speaker: 'sensor', text: 'Prøvenemnda har vurdert arbeidet ditt. Minst én del av prøven ble ikke godkjent, og da er fagprøven i spillet ikke bestått.', next: 'b' },
      { id: 'b', speaker: 'sensor', text: 'Du kan melde deg opp igjen etter mer praksis. Bruk tiden til å øve på det som ikke satt.', next: 'c' },
      { id: 'c', speaker: 'forteller', text: 'Du jobber noen måneder til i bedriften før du får gå opp til prøven på nytt.', effects: { journal: 'Fagprøven i spillet ble ikke bestått. Må ta den på nytt.' }, end: 'done' },
    ],
  },
];
