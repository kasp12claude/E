import { Notice } from '../../components/ui';
import { QuestionBank, type BankQuestion } from './QuestionBank';
import { HMS_EXTRA } from './quizBank';

// Spørsmålene bygger på generelle, allment kjente prinsipper for elsikkerhet.
// De viser ikke til konkrete paragrafer eller grenseverdier – sjekk alltid gjeldende regelverk.
const QUESTIONS: BankQuestion[] = [
  {
    q: 'Et anlegg skal gjøres spenningsløst før arbeid. Hvilken rekkefølge er riktig?',
    options: [
      'Frakoble – sikre mot innkobling – kontrollere spenningsløshet – jorde og kortslutte ved behov – skjerme nærliggende deler',
      'Kontrollere spenningsløshet – frakoble – jorde og kortslutte – sikre mot innkobling – skjerme nærliggende deler',
      'Frakoble – skjerme nærliggende deler – starte arbeidet – kontrollere spenningsløshet underveis – sikre mot innkobling',
      'Sikre mot innkobling – frakoble – starte arbeidet – jorde og kortslutte ved behov – kontrollere spenningsløshet til slutt av arbeidet',
    ],
    hint: 'Du må vite at anlegget er frakoblet og ikke kan kobles inn igjen før du kontrollerer at det faktisk er spenningsløst.',
    explanation:
      'Den sikre arbeidsrekkefølgen er: frakoble, sikre mot innkobling, kontrollere at anlegget er spenningsløst, jorde og kortslutte der det kreves, og avgrense/skjerme mot spenningsførende deler i nærheten. Følg alltid gjeldende forskrift og virksomhetens rutiner.',
  },
  {
    q: 'Hvorfor skal en spenningsprøver eller et multimeter kontrolleres mot en kjent spenningskilde før og etter at du kontrollerer spenningsløshet?',
    options: [
      'For å vite at instrumentet virker, så 0 V ikke skyldes en feil',
      'For å kalibrere instrumentet til riktig måleområde før hver måling',
      'Det er unødvendig når instrumentet er nytt og har gyldig kalibreringsmerke',
      'For å lade opp batteriet i instrumentet slik at det ikke går tomt midt i målingen',
    ],
    hint: 'Hva skjer hvis instrumentet er ødelagt og viser 0 V?',
    explanation: 'Et defekt instrument kan vise 0 V selv om det er spenning. Ved å teste på en kjent kilde før og etter vet du at målingen er til å stole på.',
  },
  {
    q: 'Du oppdager en skadet ledning med synlig blank leder på skolens verksted. Hva gjør du?',
    options: [
      'Holder avstand, sikrer at ingen berører den, og varsler lærer med en gang',
      'Teiper over skaden selv og fortsetter arbeidet uten å si fra til noen',
      'Trekker i ledningen for å kontrollere om den fortsatt er strømførende',
      'Lar den ligge, siden det er vaktmesterens ansvar og ikke elevenes',
    ],
    hint: 'Tenk på din egen og andres sikkerhet først.',
    explanation: 'Skadet utstyr kan gi elektrisk støt eller brann. Ikke berør, sikre området og meld fra slik at kvalifisert person kan gjøre utstyret spenningsløst og reparere eller kassere det.',
  },
  {
    q: 'Hvem kan utføre arbeid på et virkelig elektrisk anlegg?',
    options: [
      'Kvalifisert personell – elever bare under kvalifisert veiledning',
      'Alle som har sett en instruksjonsvideo om sikkert elektrisk arbeid',
      'Alle som er over 18 år, så lenge hovedsikringen er slått av',
      'Bare eieren av huset eller bygningen der anlegget står',
    ],
    hint: 'Elektrisk arbeid stiller krav til kompetanse.',
    explanation: 'Arbeid på elektriske anlegg krever kvalifikasjoner, opplæring og at regelverket følges. Som elev arbeider du under veiledning av kvalifisert personell.',
  },
  {
    q: 'Hva er hovedoppgaven til et jordfeilvern?',
    options: [
      'Å bryte strømmen ved lekkasje til jord, slik at fare for støt og brann reduseres',
      'Å beskytte kabelen mot overbelastning når for mange apparater er på samtidig',
      'Å jevne ut spenningen i nettet slik at apparatene får stabil forsyning',
      'Å gjøre det trygt å arbeide på anlegget uten å måtte frakoble det først',
    ],
    hint: 'Vernet sammenligner strømmen som går ut med strømmen som kommer tilbake.',
    explanation:
      'Jordfeilvernet måler forskjellen mellom strømmen i fase- og nøytralleder. Er forskjellen for stor, går noe av strømmen en annen vei (f.eks. gjennom en person eller til jord), og vernet bryter. Det erstatter aldri frakobling før arbeid.',
  },
  {
    q: 'En person har fått strømgjennomgang og er fortsatt i kontakt med den spenningsførende delen. Hva gjør du først?',
    options: [
      'Bryter strømmen først, så ringer du 113 og gir førstehjelp',
      'Drar personen løs med hendene så fort som mulig for å stoppe strømmen',
      'Heller vann på personen for å kjøle ned og stoppe strømgjennomgangen',
      'Venter og ser om personen klarer å slippe taket av seg selv',
    ],
    hint: 'Du må ikke selv bli en del av strømkretsen.',
    explanation: 'Berører du personen mens strømmen står på, kan du selv få strømgjennomgang. Bryt strømmen først, varsle (113) og start førstehjelp. Alle som har fått strømgjennomgang bør undersøkes av lege.',
  },
  {
    q: 'Hva er hensikten med en risikovurdering før et elektroarbeid?',
    options: [
      'Å finne ut hva som kan gå galt og hvilke tiltak som trengs først',
      'Å beregne hvor lang tid jobben tar og hvor mye den vil koste kunden',
      'Å bestemme hvilken leverandør som skal brukes til materiell og utstyr',
      'Den trengs bare som dokumentasjon etter at en ulykke har skjedd',
    ],
    hint: 'Ordet «risiko» handler om sannsynlighet og konsekvens.',
    explanation: 'En risikovurdering kartlegger farer, vurderer sannsynlighet og konsekvens, og bestemmer tiltak (f.eks. frakobling, verneutstyr, avsperring) før arbeidet starter.',
  },
  {
    q: 'Hvorfor er det viktig at et måleinstrument er egnet for stedet du måler på (riktig målekategori/CAT og spenningsområde)?',
    options: [
      'Det må tåle spenningstoppene på stedet, ellers kan det svikte og skade deg',
      'Det gir et skarpere og lettere lesbart display på målestedet',
      'Det har bare betydning for nøyaktigheten av avlesningen, ikke for sikkerheten',
      'Det er bare viktig når man måler på likespenning i batterianlegg',
    ],
    hint: 'Hva skjer om instrumentet ikke tåler det det utsettes for?',
    explanation: 'Måleinstrumenter er laget for bestemte bruksområder. Et instrument som ikke er egnet for målestedet kan bryte sammen, gi lysbue og skade brukeren. Sjekk instrumentets merking og bruksanvisning.',
  },
  {
    q: 'I øvingskretser bruker man ofte lav spenning (f.eks. 12 V). Hvilket utsagn er riktig?',
    options: [
      'Lav spenning gir mindre fare for støt, men kortslutning kan gi stor strøm og brann',
      'Med 12 V er alt helt ufarlig, siden spenningen er for lav til å skade noe eller noen',
      'Lav spenning gir alltid lav strøm, uansett hvor lav motstanden i kretsen er',
      'Lav spenning betyr at man ikke trenger sikring eller annet overstrømvern',
    ],
    hint: 'Tenk på Ohms lov når resistansen blir nesten null.',
    explanation: 'Selv om lav spenning gir mindre fare for strømgjennomgang i kroppen, kan en kortslutning av f.eks. et batteri gi svært stor strøm (I = U / R med liten R). Det kan gi brannskader og brann. Bruk sikring og vær forsiktig.',
  },
  {
    q: 'Hvilke regelverk og normer er sentrale for elsikkerhet og elektriske installasjoner i Norge?',
    options: [
      'Forskrift om sikkerhet ved arbeid i og drift av elektriske anlegg (FSE) og NEK 400, i gjeldende utgave',
      'Bare produsentenes egne brosjyrer og bruksanvisninger, siden det ikke finnes felles norske regler for installasjoner',
      'Det finnes ingen egne regler for små anlegg, så lenge anlegget bare brukes privat',
      'Kun internasjonale regler fra andre land, siden norske regler ikke gjelder for installasjoner',
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
