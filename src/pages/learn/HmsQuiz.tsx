import { Notice } from '../../components/ui';
import { QuestionBank, type BankQuestion } from './QuestionBank';
import { HMS_EXTRA } from './quizBank';

// Spørsmålene bygger på generelle, allment kjente prinsipper for elsikkerhet.
// De viser ikke til konkrete paragrafer eller grenseverdier – sjekk alltid gjeldende regelverk.
const QUESTIONS: BankQuestion[] = [
  {
    q: 'Et anlegg skal gjøres spenningsløst før arbeid. Hvilken rekkefølge er riktig?',
    options: [
      'Frakoble – sikre mot innkobling – kontrollere spenningsløshet – jorde og kortslutte ved behov – avgrense/skjerme mot nærliggende spenningsførende deler',
      'Kontrollere spenningsløshet – frakoble – starte arbeidet',
      'Frakoble – starte arbeidet – kontrollere spenningsløshet underveis',
      'Sikre mot innkobling – starte arbeidet – frakoble når det passer',
    ],
    hint: 'Du må vite at anlegget er frakoblet og ikke kan kobles inn igjen før du kontrollerer at det faktisk er spenningsløst.',
    explanation:
      'Den sikre arbeidsrekkefølgen er: frakoble, sikre mot innkobling, kontrollere at anlegget er spenningsløst, jorde og kortslutte der det kreves, og avgrense/skjerme mot spenningsførende deler i nærheten. Følg alltid gjeldende forskrift og virksomhetens rutiner.',
  },
  {
    q: 'Hvorfor skal en spenningsprøver eller et multimeter kontrolleres mot en kjent spenningskilde før og etter at du kontrollerer spenningsløshet?',
    options: [
      'For å være sikker på at instrumentet faktisk virker, slik at «ingen spenning» ikke skyldes et defekt instrument',
      'For å kalibrere instrumentet til riktig måleområde',
      'Det er ikke nødvendig når instrumentet er nytt',
      'For å lade opp batteriet i instrumentet',
    ],
    hint: 'Hva skjer hvis instrumentet er ødelagt og viser 0 V?',
    explanation: 'Et defekt instrument kan vise 0 V selv om det er spenning. Ved å teste på en kjent kilde før og etter vet du at målingen er til å stole på.',
  },
  {
    q: 'Du oppdager en skadet ledning med synlig blank leder på skolens verksted. Hva gjør du?',
    options: [
      'Holder avstand, sørger for at ingen berører den, og varsler lærer/ansvarlig med en gang',
      'Teiper over skaden selv og fortsetter arbeidet',
      'Trekker i ledningen for å se om den er strømførende',
      'Lar den ligge – det er ikke ditt ansvar',
    ],
    hint: 'Tenk på din egen og andres sikkerhet først.',
    explanation: 'Skadet utstyr kan gi elektrisk støt eller brann. Ikke berør, sikre området og meld fra slik at kvalifisert person kan gjøre utstyret spenningsløst og reparere eller kassere det.',
  },
  {
    q: 'Hvem kan utføre arbeid på et virkelig elektrisk anlegg?',
    options: [
      'Personer med nødvendig kvalifikasjon og opplæring – elever bare under kvalifisert veiledning og etter skolens rutiner',
      'Alle som har sett en instruksjonsvideo',
      'Alle, så lenge sikringen er slått av',
      'Bare den som eier huset',
    ],
    hint: 'Elektrisk arbeid stiller krav til kompetanse.',
    explanation: 'Arbeid på elektriske anlegg krever kvalifikasjoner, opplæring og at regelverket følges. Som elev arbeider du under veiledning av kvalifisert personell.',
  },
  {
    q: 'Hva er hovedoppgaven til et jordfeilvern?',
    options: [
      'Å bryte strømmen når det oppstår lekkasjestrøm (jordfeil), for å redusere faren for elektrisk støt og brann',
      'Å beskytte kabelen mot overbelastning fra for mange apparater',
      'Å jevne ut spenningen i nettet',
      'Å gjøre det trygt å arbeide på anlegget uten å frakoble',
    ],
    hint: 'Vernet sammenligner strømmen som går ut med strømmen som kommer tilbake.',
    explanation:
      'Jordfeilvernet måler forskjellen mellom strømmen i fase- og nøytralleder. Er forskjellen for stor, går noe av strømmen en annen vei (f.eks. gjennom en person eller til jord), og vernet bryter. Det erstatter aldri frakobling før arbeid.',
  },
  {
    q: 'En person har fått strømgjennomgang og er fortsatt i kontakt med den spenningsførende delen. Hva gjør du først?',
    options: [
      'Bryter strømmen (eller får den brutt) før du berører personen, og ringer deretter 113 og gir førstehjelp',
      'Drar personen løs med hendene med en gang',
      'Heller vann på personen',
      'Venter til personen slipper av seg selv',
    ],
    hint: 'Du må ikke selv bli en del av strømkretsen.',
    explanation: 'Berører du personen mens strømmen står på, kan du selv få strømgjennomgang. Bryt strømmen først, varsle (113) og start førstehjelp. Alle som har fått strømgjennomgang bør undersøkes av lege.',
  },
  {
    q: 'Hva er hensikten med en risikovurdering før et elektroarbeid?',
    options: [
      'Å finne ut hva som kan gå galt, hvor alvorlig det kan bli og hvilke tiltak som må på plass før arbeidet starter',
      'Å beregne hvor lang tid jobben tar',
      'Å bestemme hvilken leverandør som skal brukes',
      'Den er bare nødvendig etter at en ulykke har skjedd',
    ],
    hint: 'Ordet «risiko» handler om sannsynlighet og konsekvens.',
    explanation: 'En risikovurdering kartlegger farer, vurderer sannsynlighet og konsekvens, og bestemmer tiltak (f.eks. frakobling, verneutstyr, avsperring) før arbeidet starter.',
  },
  {
    q: 'Hvorfor er det viktig at et måleinstrument er egnet for stedet du måler på (riktig målekategori/CAT og spenningsområde)?',
    options: [
      'Instrumentet må tåle spenningen og eventuelle spenningstopper på målestedet, ellers kan det svikte og skade brukeren',
      'Det gir penere avlesning på displayet',
      'Det har bare betydning for nøyaktigheten, ikke for sikkerheten',
      'Det er bare viktig ved måling av likespenning',
    ],
    hint: 'Hva skjer om instrumentet ikke tåler det det utsettes for?',
    explanation: 'Måleinstrumenter er laget for bestemte bruksområder. Et instrument som ikke er egnet for målestedet kan bryte sammen, gi lysbue og skade brukeren. Sjekk instrumentets merking og bruksanvisning.',
  },
  {
    q: 'I øvingskretser bruker man ofte lav spenning (f.eks. 12 V). Hvilket utsagn er riktig?',
    options: [
      'Lav spenning reduserer faren for farlig strømgjennomgang, men en kortslutning kan fortsatt gi store strømmer, varme og brann',
      'Med 12 V er alt helt ufarlig, også kortslutning av et stort batteri',
      'Lav spenning gir alltid lav strøm',
      'Lav spenning betyr at man ikke trenger sikring',
    ],
    hint: 'Tenk på Ohms lov når resistansen blir nesten null.',
    explanation: 'Selv om lav spenning gir mindre fare for strømgjennomgang i kroppen, kan en kortslutning av f.eks. et batteri gi svært stor strøm (I = U / R med liten R). Det kan gi brannskader og brann. Bruk sikring og vær forsiktig.',
  },
  {
    q: 'Hvilke regelverk og normer er sentrale for elsikkerhet og elektriske installasjoner i Norge?',
    options: [
      'Blant annet forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg (FSE) og normen NEK 400 for lavspenningsinstallasjoner – alltid i gjeldende utgave',
      'Det finnes ingen regler for små anlegg',
      'Bare produsentens reklamebrosjyrer',
      'Kun regler fra andre land',
    ],
    hint: 'Det ene er en forskrift om arbeid og drift, det andre en norm for installasjoner.',
    explanation:
      'FSE gjelder sikkerhet ved arbeid i og drift av elektriske anlegg, og NEK 400 er normen for elektriske lavspenningsinstallasjoner. Regelverk oppdateres – bruk alltid gjeldende utgave og følg opplæring fra skole/arbeidsgiver. ElektroStudio gjengir ikke konkrete krav fra disse.',
  },
];

const ALL = [...QUESTIONS, ...HMS_EXTRA];

export function HmsQuiz() {
  return (
    <div>
      <Notice kind="warn" title="HMS og elsikkerhet">
        Spørsmålene tar opp generelle sikkerhetsprinsipper. De erstatter ikke opplæring, gjeldende forskrifter og normer eller instruks fra lærer/arbeidsgiver.
      </Notice>
      <QuestionBank moduleId="hms" questions={ALL} />
    </div>
  );
}
