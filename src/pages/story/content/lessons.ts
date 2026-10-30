// Undervisning før skoleoppdragene i Story Mode. Nøkkel = oppdrags-id.
// Læreren forklarer det oppgaven tester – men gir ikke bort fasiten.
// Alt arbeid med strøm i undervisningen gjelder lav spenning eller simulering.
import type { Lesson } from '../types';

export const LESSONS: Record<string, Lesson> = {
  // ===================================================================
  // Vg1
  // ===================================================================
  k1_verktoy: {
    teacher: 'mari',
    title: 'Elektrikerens verktøy',
    slides: [
      {
        title: 'Riktig verktøy til riktig jobb',
        text: 'Feil verktøy gir dårlig arbeid og skader: en tang som kutter kobberet gir dårlig kontakt, en skrutrekker uten isolasjon kan gi kontakt med spenning. Vi deler verktøyet i tre grupper: verktøy som jobber med lederen, verktøy som måler, og verktøy som kontrollerer.',
      },
      {
        title: 'Verktøy som jobber med lederen',
        text: 'Avisoleringstanga er innstilt slik at den tar isolasjonen, men lar kobberet være helt. Kombinasjonstanga er allroundverktøyet: den griper, bøyer og kapper. Isolerte skrutrekkere er merket for elektroarbeid og brukes til klemmer og skruer i utstyr.',
        example: 'Hakk i kobberet blir et svakt punkt som kan bli varmt eller knekke.',
      },
      {
        title: 'Verktøy som måler',
        text: 'Multimeteret er et måleinstrument med flere funksjoner: det kan måle spenning, strøm og resistans. Du velger funksjon og område med bryteren, og prøvespissene settes i riktige kontakter. Feil innstilling kan ødelegge instrumentet eller gi feil svar.',
      },
      {
        title: 'Verktøy som kontrollerer',
        text: 'En topolet spenningsprøver brukes til én ting: å finne ut om det er spenning der du skal jobbe. Den sjekkes alltid mot en kjent spenningskilde før og etter bruk. En kontrolltester for stikkontakter viser raskt om et uttak har spenning og om jordingen ser ut til å være tilkoblet.',
      },
    ],
    check: {
      q: 'Hvorfor sjekker man spenningsprøveren mot en kjent spenningskilde før og etter bruk?',
      options: [
        'For å vite at den faktisk virker, så «ingen spenning» er til å stole på',
        'For å lade batteriet i prøveren',
        'Fordi det står i garantien',
        'For å nullstille måleområdet',
      ],
      explanation: 'En defekt prøver viser «ingen spenning» også der det er spenning. Kontrollen før og etter viser at den virket hele tiden.',
    },
  },

  k1_hms: {
    teacher: 'mari',
    title: 'HMS på verkstedet',
    slides: [
      {
        title: 'Hvorfor HMS?',
        text: 'HMS betyr helse, miljø og sikkerhet. På verkstedet handler det om at alle skal gå hjem like hele som de kom. De fleste ulykker skjer ikke fordi noen er dumme, men fordi noen tar en snarvei «bare denne ene gangen».',
      },
      {
        title: 'Orden og renhold',
        text: 'Mat og drikke hører hjemme i pauserommet, ikke ved øvingstavlene. Søl kan gi kortslutning og skader. Ledninger på gulvet er snublefeller. Ser du noe som er farlig, ordner du det eller sier fra – uansett hvem som laget rotet.',
      },
      {
        title: 'Spenningsløst før omkobling',
        text: 'Før du kobler om noe, slår du av spenningen og kontrollerer at den faktisk er av. Det gjelder også på 12 V: en kortslutning kan gi stor strøm, gnister og brannskader. Viktigst er vanen – den samme vanen skal redde deg den dagen det er 230 V.',
      },
      {
        title: 'Skadet utstyr og grenser',
        text: 'Utstyr med skadet isolasjon tas ut av bruk, merkes «defekt» og meldes til læreren. Det skal ikke lappes med teip. Noen steder er stengt for elever, for eksempel inne i fordelingstavler med 230/400 V. Er du usikker: stopp og spør.',
      },
    ],
    check: {
      q: 'Hva er den viktigste grunnen til å slå av 12 V-forsyningen før du kobler om?',
      options: [
        'Kortslutning kan gi gnister og brannskader, og du bygger en trygg vane til senere',
        '12 V er livsfarlig ved berøring under alle forhold',
        'Strømforsyningen blir slitt av å stå på',
        'Det sparer strøm',
      ],
      explanation: 'Selv lav spenning kan gi stor kortslutningsstrøm. Og vanen med å koble spenningsløst er den som beskytter deg ved høyere spenninger.',
    },
  },

  k1_symboler: {
    teacher: 'trond',
    title: 'Symbolene i koblingsskjemaet',
    slides: [
      {
        title: 'Skjemaet er et språk',
        text: 'Et koblingsskjema viser hvordan komponentene er koblet, ikke hvordan de ser ut. Hvert symbol er en «bokstav». Lær formene, så kan du lese skjemaer fra hele verden – symbolene er stort sett felles internasjonalt.',
      },
      {
        title: 'Kilder og laster',
        text: 'En strømkilde for likespenning tegnes med en lang og en kort strek – den lange er pluss. En lampe er en sirkel med et kryss inni. En ringeklokke tegnes som en halv kuppel med to «bein» ned til tilkoblingene. En motstand er et avlangt rektangel.',
        symbol: 'dc-source',
      },
      {
        title: 'Kontakter og knapper',
        text: 'En bryter tegnes som en linje som står skrått – den viser at kontakten kan åpnes og lukkes. En trykknapp har en liten «knapp» tegnet på toppen, og den går tilbake når du slipper. I hvilestilling er sluttekontakter tegnet åpne.',
        symbol: 'switch-no',
      },
      {
        title: 'Vern og jord',
        text: 'En sikring er et rektangel med en linje gjennom hele lengden – den skal smelte og bryte ved for stor strøm. Jordsymbolet har flere vannrette streker som blir kortere nedover, som en pil ned i bakken.',
        symbol: 'ground',
      },
    ],
    check: {
      q: 'Hva viser et koblingsskjema?',
      options: [
        'Hvordan komponentene er koblet sammen elektrisk',
        'Nøyaktig hvordan komponentene ser ut',
        'Hvor komponentene står i rommet',
        'Hva komponentene koster',
      ],
      explanation: 'Koblingsskjemaet viser forbindelsene. Hvor ting står i bygget, viser en plantegning.',
    },
  },

  k1_lampeskjema: {
    teacher: 'trond',
    title: 'Ditt første koblingsskjema',
    slides: [
      {
        title: 'En sluttet krets',
        text: 'Strøm går bare når det finnes en sammenhengende vei fra kildens pluss, gjennom lasten og tilbake til minus. Bryteren er en port i denne veien: lukket bryter – sluttet krets – lampen lyser. Åpen bryter – brudd – lampen slukker.',
      },
      {
        title: 'Bryteren i serie',
        text: 'Bryteren må stå i serie med lampen, altså i samme vei som strømmen. Står den parallelt med lampen, kortslutter den lampen i stedet – og kortslutter kanskje hele kilden.',
        symbol: 'switch-no',
      },
      {
        title: 'Betegnelser',
        text: 'Hver komponent får en betegnelse: en bokstav for typen og et nummer. I ElektroStudio bruker vi G for strømkilder, S for brytere og knapper og E for lamper. Da kan alle som leser skjemaet, snakke om «S1» og vite hvilken bryter det er.',
      },
      {
        title: 'Slik tegner du i ElektroStudio',
        text: 'Dra komponentene inn fra biblioteket. Tegn ledninger ved å dra fra én terminal til den neste – ledningen festes når den treffer terminalen. Bruk «Simuler» og klikk på bryteren for å teste før du leverer. Du leverer bare én gang.',
      },
    ],
    check: {
      q: 'Hva skjer hvis bryteren kobles parallelt med lampen i stedet for i serie?',
      options: [
        'Bryteren kortslutter lampen når den lukkes',
        'Lampen lyser sterkere',
        'Ingenting – det virker likt',
        'Lampen lyser bare når bryteren er åpen, og det er riktig',
      ],
      explanation: 'En lukket bryter har nesten null motstand. Står den parallelt med lampen, tar strømmen veien gjennom bryteren i stedet.',
    },
  },

  k1_ohm: {
    teacher: 'trond',
    title: 'Ohms lov og effekt',
    slides: [
      {
        title: 'Tre størrelser',
        text: 'Spenning (U) måles i volt og er «trykket» som driver strømmen. Strøm (I) måles i ampere og er hvor mye som går gjennom. Resistans (R) måles i ohm og er hvor mye komponenten hindrer strømmen.',
      },
      {
        title: 'Ohms lov',
        text: 'Spenning, strøm og resistans henger sammen. Kjenner du to av dem, kan du regne ut den tredje. Dekk over den du skal finne i trekanten U over R og I.',
        formula: 'U = R · I     I = U / R     R = U / I',
        example: 'En motstand på 60 Ω kobles til 12 V: I = 12 V / 60 Ω = 0,2 A.',
      },
      {
        title: 'Effekt',
        text: 'Effekt (P) måles i watt og forteller hvor mye energi komponenten bruker per sekund. Den regnes ut fra spenningen og strømmen.',
        formula: 'P = U · I',
        example: 'Samme motstand: P = 12 V · 0,2 A = 2,4 W.',
      },
      {
        title: 'Tips til regningen',
        text: 'Skriv formelen først, sett inn tallene med enheter, og regn til slutt. Sjekk at svaret er rimelig: en liten lampe på 12 V trekker ikke 100 A. Desimaler skriver vi med komma.',
        example: 'En komponent trekker 0,2 A på 6 V: R = 6 V / 0,2 A = 30 Ω.',
      },
    ],
    check: {
      q: 'Du kjenner spenningen og strømmen. Hvilken formel gir resistansen?',
      options: ['R = U / I', 'R = U · I', 'R = I / U', 'R = P · I'],
      explanation: 'Ohms lov U = R · I snus om til R = U / I.',
    },
  },

  k1_ringeklokke: {
    teacher: 'mari',
    title: 'Ringeklokke med trykknapp',
    slides: [
      {
        title: 'Trykknapp i stedet for bryter',
        text: 'En ringeklokke skal bare ringe så lenge noen holder inne knappen. Derfor bruker vi en trykknapp med sluttekontakt: den er åpen i hvile, slutter når du trykker, og fjæra åpner den igjen når du slipper.',
        symbol: 'pushbutton-no',
      },
      {
        title: 'Kretsen',
        text: 'Det er den samme grunnkretsen som med lampen: fra kildens pluss, gjennom knappen, gjennom klokka og tilbake til minus. Knappen og klokka står i serie.',
        symbol: 'bell',
      },
      {
        title: 'Test i simulatoren',
        text: 'I simulatoren holder du inne trykknappen med musa. Klokka skal ringe mens du holder, og stoppe når du slipper. Ringer den hele tiden, eller aldri, er noe koblet feil. Test før du leverer – du leverer bare én gang.',
      },
      {
        title: 'I virkeligheten',
        text: 'En ekte ringeklokke får lav spenning fra en ringetransformator. Transformatorens side mot 230 V installeres av en fagperson, og arbeidet skal følge gjeldende forskrifter. Vi bygger bare lavspenningssiden – og bare i simulatoren.',
        symbol: 'transformer',
      },
    ],
    check: {
      q: 'Hvorfor brukes en trykknapp og ikke en vanlig bryter til ringeklokka?',
      options: [
        'Trykknappen går tilbake når du slipper, så klokka slutter å ringe',
        'Trykknappen tåler høyere spenning',
        'En bryter kan ikke kobles i serie',
        'Trykknappen bruker mindre strøm',
      ],
      explanation: 'En vanlig bryter blir stående på – da ville klokka ringet til noen slo den av igjen.',
    },
  },

  k1_feil: {
    teacher: 'mari',
    title: 'Feilsøking med multimeter',
    slides: [
      {
        title: 'Ikke gjett – mål',
        text: 'Når noe ikke virker, er det fristende å bytte deler til det virker. En fagperson måler seg fram i stedet. Det er raskere, billigere, og du lærer hvorfor feilen oppsto.',
      },
      {
        title: 'Spenning over en komponent',
        text: 'Du måler spenning ved å sette multimeterets prøvespisser på hver sin side av komponenten. Instrumentet viser spenningsforskjellen mellom de to punktene. I en fungerende seriekrets fordeler spenningen seg over lastene.',
      },
      {
        title: 'Når kretsen har et brudd',
        text: 'Ved et brudd går det ingen strøm. Uten strøm blir det ingen spenning over de hele komponentene, og en lukket bryter har heller ikke spenning over seg. Hele kildespenningen ligger da over stedet der kretsen er åpen.',
        example: 'Tre lamper i serie på 9 V, én er røket: du måler 0 V over de to hele og 9 V over den defekte.',
      },
      {
        title: 'Systematisk',
        text: 'Mål først over kilden – er det spenning der? Mål så over hver komponent etter tur. Skriv ned målingene. Til slutt peker du ut komponenten, og du har bare ett svar.',
      },
    ],
    check: {
      q: 'Over hvilken del av en seriekrets måler du hele kildespenningen når det er et brudd?',
      options: ['Over bruddstedet', 'Over de hele lampene', 'Over en lukket bryter', 'Ingen steder'],
      explanation: 'Uten strøm faller det ingen spenning over de hele delene, så hele spenningen ligger over åpningen.',
    },
  },

  k1_hmsprove: {
    teacher: 'trond',
    title: 'Repetisjon før HMS-prøven',
    slides: [
      {
        title: 'Personlig sikkerhet',
        text: 'Ringer, armbånd og klokker i metall tar du av før elektroarbeid: metall leder strøm og kan gi kortslutning og brannskader. Verktøy til elektroarbeid skal være isolert og merket for formålet.',
      },
      {
        title: 'Lysbue og brann',
        text: 'En lysbue er en ekstremt varm elektrisk utladning gjennom luft. Den kan oppstå ved kortslutning og gi alvorlige brannskader og øyeskader. Brann i elektrisk utstyr slukkes aldri med vann – bruk et slukkeapparat som er beregnet for elektrisk utstyr.',
      },
      {
        title: 'Lås og skilt',
        text: 'Når noen arbeider på en kurs, låses den i av-stilling og merkes med et skilt om at arbeid pågår. Da vet alle at den ikke skal slås på. Er du usikker på om noe er frakoblet: stopp, mål og spør den ansvarlige.',
      },
      {
        title: 'Avvik',
        text: 'Et avvik er noe som ikke er som det skal: en farlig situasjon, en skade, en nesten-ulykke eller et brudd på rutinene. Avvik meldes, slik at alle kan lære og det ikke skjer igjen. Skadet utstyr og skjøteledninger tas ut av bruk.',
      },
    ],
    check: {
      q: 'Hvorfor melder man nesten-ulykker, selv om ingen ble skadet?',
      options: [
        'Slik at årsaken blir rettet før noen faktisk blir skadet',
        'For å finne noen å straffe',
        'Det er bare nødvendig når noen blir skadet',
        'For at forsikringen skal betale',
      ],
      explanation: 'Avviksmeldinger handler om å lære. En nesten-ulykke er et gratis varsel om en fare.',
    },
  },

  k1_risiko: {
    teacher: 'mari',
    title: 'Slik lager du en risikovurdering',
    slides: [
      {
        title: 'Tenk før du starter',
        text: 'En risikovurdering er å tenke gjennom arbeidet før du begynner: Hva skal gjøres? Hva kan gå galt? Hvor ille blir det? Og hva gjør vi for å hindre det? Den skal handle om akkurat dette arbeidet, på akkurat dette stedet.',
      },
      {
        title: 'Finn de reelle farene',
        text: 'Gå gjennom arbeidet steg for steg: verktøyet du bruker, strømmen, stedet, kroppen din. Ta bare med farer som faktisk finnes i denne jobben. En lang liste med ting som ikke kan skje, gjør vurderingen dårligere, ikke bedre.',
      },
      {
        title: 'Velg tiltak som virker',
        text: 'Et godt tiltak fjerner faren eller gjør den mindre: slå av spenningen, bruk verneutstyr, rydd, bruk riktig verktøy. «Jobb fortere» eller «være forsiktig» er ikke tiltak – det endrer ikke selve faren.',
        example: 'Fare: snubling i kabler. Tiltak: legg kablene langs veggen og rydd underveis.',
      },
    ],
    check: {
      q: 'Hva er et godt tiltak mot kuttskader når du jobber med ledninger?',
      options: [
        'Bruke riktig verktøy og skjære bort fra kroppen',
        'Jobbe raskere så eksponeringen blir kortere',
        'Ta med plaster',
        'Skrive faren på en lapp',
      ],
      explanation: 'Riktig verktøy og riktig teknikk reduserer selve faren. Plaster hjelper først etter at skaden har skjedd.',
    },
  },

  k1_styring: {
    teacher: 'trond',
    title: 'Grunnleggende styring',
    slides: [
      {
        title: 'Innganger og utganger',
        text: 'En styring tar imot signaler og slår ting av og på. Brytere, trykknapper og sensorer er innganger – de forteller at noe har skjedd. Lamper, motorer og ringeklokker er utganger, også kalt laster.',
        symbol: 'sensor',
      },
      {
        title: 'Bryter eller trykknapp?',
        text: 'En bryter blir stående i stillingen du setter den i. En trykknapp er fjærbelastet og går tilbake når du slipper. Begge kan ha sluttekontakt (NO, åpen i hvile) eller brytekontakt (NC, sluttet i hvile).',
        symbol: 'pushbutton-nc',
      },
      {
        title: 'Reléet',
        text: 'Et relé har en spole og et sett kontakter. Når spolen får strøm, blir den en elektromagnet som trekker om kontaktene. Da kan en liten strøm i styrekretsen koble en mye større strøm i lastkretsen. En kontaktor er et kraftigere relé for store laster som motorer.',
        symbol: 'relay-coil',
      },
      {
        title: 'Feil skal gi stopp',
        text: 'En god styring er laget slik at vanlige feil gjør den trygg, ikke farlig. Et ledningsbrudd skal helst få maskinen til å stoppe – ikke gjøre det umulig å stoppe den. Tenk over dette når du velger mellom NO og NC.',
      },
    ],
    check: {
      q: 'Hvilken av disse er en utgang (last) i en styring?',
      options: ['En motor', 'En trykknapp', 'En bevegelsessensor', 'En bryter'],
      explanation: 'Motoren gjør jobben – den er lasten. Knapper, brytere og sensorer gir signaler inn.',
    },
  },

  // ===================================================================
  // Vg2
  // ===================================================================
  k2_motorteori: {
    teacher: 'ivar',
    title: 'Trefasemotoren og hvordan den startes',
    slides: [
      {
        title: 'Asynkronmotoren',
        text: 'Den vanligste motoren i industrien er trefase asynkronmotor. De tre fasene lager et roterende magnetfelt som drar rotoren med seg. Rekkefølgen på fasene bestemmer hvilken vei feltet – og motoren – roterer.',
        symbol: 'motor-3',
      },
      {
        title: 'Turtall',
        text: 'Feltets turtall kalles synkront turtall og avhenger av nettfrekvensen og antall polpar i motoren. Flere polpar gir lavere turtall. Rotoren går litt saktere enn feltet – det kalles sakking, og det er derfor motoren heter «asynkron».',
        formula: 'n = 60 · f / p   (p = antall polpar)',
        example: 'Tre polpar på 50 Hz: n = 60 · 50 / 3 = 1 000 o/min.',
      },
      {
        title: 'Startstrøm',
        text: 'En motor trekker mye strøm i det den starter. Stjerne-/trekantstart, mykstarter og frekvensomformer er metoder for å gjøre starten skånsom. Et tidsrelé brukes ofte til å bestemme når en stjerne-/trekantstart skal koble om. Frekvensomformeren kan i tillegg regulere turtallet.',
        symbol: 'timer-on',
      },
      {
        title: 'Merkeskilt og nødstopp',
        text: 'Merkeskiltet forteller blant annet effekt, spenning, strøm, turtall og koblingsmåte. Les det før du kobler. En nødstopp skal stoppe maskinen raskt og sikkert ved fare – den er ikke en vanlig av-knapp.',
      },
    ],
    check: {
      q: 'Hva bestemmer hvilken vei en trefase asynkronmotor roterer?',
      options: ['Rekkefølgen på fasene', 'Hvor stor sikringen er', 'Lengden på kabelen', 'Hvilken farge lederne har'],
      explanation: 'Faserekkefølgen bestemmer hvilken vei magnetfeltet roterer, og rotoren følger feltet.',
    },
  },

  k2_selvhold_skjema: {
    teacher: 'ivar',
    title: 'Selvhold – start og stopp',
    slides: [
      {
        title: 'Problemet',
        text: 'En START-knapp er en trykknapp. Slipper du den, åpner den igjen. Men en motor skal fortsette å gå etter at du har sluppet START. Løsningen heter selvhold: reléet holder seg selv inne.',
        symbol: 'pushbutton-no',
      },
      {
        title: 'Selvholdkontakten',
        text: 'Reléet K1 har en egen sluttekontakt. Den kobles parallelt med START-knappen. Når du trykker START, trekker spolen, og K1-kontakten slutter. Når du slipper START, går strømmen videre gjennom K1-kontakten – reléet holder seg selv.',
        symbol: 'relay-no',
      },
      {
        title: 'STOPP i serie',
        text: 'STOPP er en trykknapp med brytekontakt (NC). Den står i serie før START og selvholdet. Trykker du STOPP, brytes hele styrekretsen, spolen slipper, og selvholdkontakten åpner. Du må trykke START på nytt for å starte.',
        symbol: 'pushbutton-nc',
      },
      {
        title: 'Navn og testing',
        text: 'Kontakten og spolen til samme relé har samme betegnelse, for eksempel K1. Slik ser man at de hører sammen, selv om de står langt fra hverandre i skjemaet. Test i simulatoren: start, slipp, stopp. Du leverer én gang.',
      },
    ],
    check: {
      q: 'Hvor står selvholdkontakten i forhold til START-knappen?',
      options: ['Parallelt med START', 'I serie med START', 'Parallelt med STOPP', 'I serie med lasten i hovedkretsen'],
      explanation: 'Parallelt med START gir den en ny strømvei som holder spolen inne når START slippes.',
    },
  },

  k2_motorfeil: {
    teacher: 'ivar',
    title: 'Feilsøking i styrestrømkretser',
    slides: [
      {
        title: 'Les symptomet',
        text: 'Symptomet forteller hvor du skal begynne. Starter ingenting? Da er det trolig noe i hovedveien til spolen. Virker noe bare delvis? Da virker en del av kretsen – og feilen ligger i den delen som har ansvar for det som ikke skjer.',
      },
      {
        title: 'Hvem gjør hva?',
        text: 'Gå gjennom komponentene og spør: hva er oppgaven til STOPP, START, spolen, selvholdkontakten og lasten? Hvilken av dem er det som ikke gjør jobben sin, gitt det du ser?',
      },
      {
        title: 'Mål for å bekrefte',
        text: 'En sluttet kontakt som leder strøm, har nesten 0 V over seg. Måler du full spenning over en kontakt som skulle vært sluttet, er den åpen. Mål mens kretsen er i den tilstanden der feilen viser seg.',
        example: 'STOPP (brytekontakt) skal lede når ingen trykker. Viser den hele styrespenningen i hvile, er kontakten brent eller brutt.',
      },
      {
        title: 'Overlastvern',
        text: 'I ekte motorstyringer står det også et overlastvern (motorvern). Brytekontakten fra vernet ligger i serie i styrekretsen og åpner hvis motoren trekker for mye strøm over tid. Har vernet løst ut, må årsaken finnes før man tilbakestiller.',
        symbol: 'overload-nc',
      },
    ],
    check: {
      q: 'Du måler full styrespenning over en kontakt som skulle vært sluttet. Hva betyr det?',
      options: ['Kontakten er åpen', 'Kontakten er i orden', 'Det er kortslutning i kontakten', 'Spolen er defekt'],
      explanation: 'Over en sluttet kontakt som leder strøm, er spenningen nesten null. Full spenning betyr at kretsen er brutt akkurat der.',
    },
  },

  k2_trapp: {
    teacher: 'ivar',
    title: 'Trappekobling med vekselbrytere',
    slides: [
      {
        title: 'Lys fra to steder',
        text: 'I en trapp vil man slå lyset av og på både nede og oppe. Det klarer ikke en vanlig bryter. Vi bruker to vekselbrytere (omkoblere).',
      },
      {
        title: 'Vekselbryteren',
        text: 'En vekselbryter har tre klemmer: fellesklemmen C, og klemmene 1 og 2. Fellesklemmen er alltid koblet til enten 1 eller 2. Hver gang du vipper, bytter den.',
        symbol: 'changeover',
      },
      {
        title: 'Korrespondanselederne',
        text: 'Mellom de to bryterne går det to ledere: korrespondanselederne. Lampen lyser når begge bryterne peker på samme leder, og slukker når de peker på hver sin. Derfor kan begge bryterne endre tilstanden – uansett hvor den andre står.',
      },
      {
        title: 'Test alle fire stillinger',
        text: 'To brytere med to stillinger hver gir fire kombinasjoner. Test alle i simulatoren: hver gang du vipper én av bryterne, skal lampen bytte mellom av og på. Se tilbake på hvor fellesklemmene er koblet hvis det ikke stemmer.',
      },
    ],
    check: {
      q: 'Hvor mange klemmer har en vanlig vekselbryter?',
      options: ['Tre', 'To', 'Fire', 'Seks'],
      explanation: 'Fellesklemme pluss to stillinger: C, 1 og 2.',
    },
  },

  k2_husplan: {
    teacher: 'ivar',
    title: 'Planlegging av en installasjon',
    slides: [
      {
        title: 'Plantegningen',
        text: 'En installasjonsplan viser hvor alt skal stå i bygget: lys, brytere, stikkontakter, koblingsbokser, fordelingen og kablene mellom dem. Den brukes til tilbud, montering og dokumentasjon.',
        symbol: 'plan-panel',
      },
      {
        title: 'Tenk som brukeren',
        text: 'Plasser lysbrytere ved døra, på låsesiden. Sett stikkontakter der folk faktisk skal bruke strøm: ved sengen, ved TV-en, på kjøkkenbenken. Et rom uten nok uttak gir skjøteledninger – og de er en brannfare.',
        symbol: 'plan-socket',
      },
      {
        title: 'Kabelruter',
        text: 'Alle kurser starter i fordelingstavla. Tegn kabelrutene fra tavla og ut til rommene, gjerne via koblingsbokser. Korte og ryddige ruter er lettere å montere og å feilsøke. Selve dimensjoneringen må alltid følge gjeldende forskrifter og normer.',
        symbol: 'plan-junction-box',
      },
      {
        title: 'I ElektroStudio',
        text: 'Bruk Rom-verktøyet (U) for rommene og gi dem navn. Plasser symbolene fra biblioteket. Kabelrute-verktøyet (K) tegner rutene. Åpne materiallisten og sjekk at alt er med før du leverer – du leverer én gang.',
      },
    ],
    check: {
      q: 'Hvor bør en lysbryter vanligvis plasseres?',
      options: ['Ved døra, slik at du når den når du kommer inn', 'Midt i taket', 'Bak den største møbelen', 'Så langt fra døra som mulig'],
      explanation: 'Man skal kunne slå på lyset idet man går inn i rommet.',
    },
  },

  k2_materialer: {
    teacher: 'ivar',
    title: 'Materialliste fra plantegning',
    slides: [
      {
        title: 'Hvorfor telle?',
        text: 'Materiallisten er grunnlaget for prisen til kunden og for bestillingen til grossisten. Teller du feil, taper bedriften penger – eller montøren står uten deler på jobb.',
      },
      {
        title: 'Lær symbolforklaringen',
        text: 'Hvert symbol på plantegningen betyr én ting. Et vanlig lampepunkt og en downlight har ulike symboler og skal telles hver for seg. Det samme gjelder koblingsbokser og fordelingstavla.',
        symbol: 'plan-downlight',
      },
      {
        title: 'Tell systematisk',
        text: 'Ta ett rom om gangen, og én type om gangen. Kryss av hvert symbol når du har talt det. Tell til slutt sammen per type. Se også etter ting som står på grensen mellom to rom, slik at du ikke teller dem to ganger.',
        example: 'Stue: 2 stikkontakter + kjøkken: 2 + bad: 1 = 5 stikkontakter totalt.',
      },
    ],
    check: {
      q: 'Hva er den beste måten å unngå å glemme symboler på?',
      options: ['Telle rom for rom og krysse av hvert symbol', 'Telle alt i hodet på én gang', 'Anslå ut fra størrelsen på huset', 'Telle bare de største rommene'],
      explanation: 'Systematikk og avkryssing gir riktige tall – også på store tegninger.',
    },
  },

  k2_risiko: {
    teacher: 'ivar',
    title: 'Risikovurdering av elektrisk arbeid',
    slides: [
      {
        title: 'Elektrisk fare først',
        text: 'Ved arbeid på en installasjon er strømmen den største faren. Den sikre rekkefølgen er: frakoble, sikre mot innkobling med lås og skilt, og kontrollere at det er spenningsløst med en kontrollert spenningsprøver. Følg gjeldende forskrifter og bedriftens rutiner.',
      },
      {
        title: 'Arbeid i høyden',
        text: 'Arbeid i taket betyr stige eller stillas. Stigen skal stå stødig, og ved elektrisk arbeid er en ikke-ledende stige å foretrekke. Det som kan falle ned – verktøy, deler, armaturen – er en fare for dem som står under.',
      },
      {
        title: 'Skarpe kanter og glass',
        text: 'Gamle armaturer kan ha skarpe kanter, og lysrør og glass kan knuse. Hansker og vernebriller beskytter mot kutt og splinter.',
      },
      {
        title: 'Tiltak, ikke ønsker',
        text: 'Et tiltak må gjøre faren mindre i praksis. «Jobbe raskt mens strømmen står på» er ikke et tiltak – det øker risikoen. Ta bare med farer som finnes i akkurat denne jobben.',
      },
    ],
    check: {
      q: 'Hvilken rekkefølge er riktig før arbeid på en kurs?',
      options: [
        'Frakoble, sikre mot innkobling, kontrollere spenningsløshet',
        'Kontrollere spenningsløshet, frakoble, sikre',
        'Sikre, jobbe, frakoble',
        'Frakoble, jobbe, kontrollere',
      ],
      explanation: 'Først kobler du fra, så sørger du for at ingen kan slå på, og så måler du at det faktisk er spenningsløst.',
    },
  },

  k2_effekt: {
    teacher: 'ivar',
    title: 'Effekt, strøm og energi',
    slides: [
      {
        title: 'Strøm fra effekt',
        text: 'Apparater er merket med effekt i watt. Vil du vite hvor mye strøm de trekker, deler du effekten på spenningen. Står flere apparater på samme kurs samtidig, legger du sammen effektene først.',
        formula: 'I = P / U',
        example: 'Et varmeapparat på 1 150 W på 230 V: I = 1 150 / 230 = 5 A.',
      },
      {
        title: 'Energi',
        text: 'Energi er effekt ganger tid. På strømregningen måles den i kilowattimer (kWh). Gjør om watt til kilowatt (del på 1 000) og minutter til timer (del på 60) før du ganger.',
        formula: 'W = P · t   (kW · h = kWh)',
        example: 'En ovn på 1 500 W i 20 minutter: 1,5 kW · (20/60) h = 0,5 kWh.',
      },
      {
        title: 'Hvorfor vernet løser ut',
        text: 'Kursen er beskyttet av et vern som løser ut når strømmen blir for stor for kabelen. Står mange effektkrevende apparater på samtidig, kan summen bli høyere enn vernet tillater. Det er vernet som gjør jobben sin – ikke en feil.',
        symbol: 'mcb',
      },
    ],
    check: {
      q: 'En komfyrplate på 2 000 W står på i 30 minutter. Hvor mye energi brukes?',
      options: ['1 kWh', '60 kWh', '2 kWh', '0,5 kWh'],
      explanation: '2 kW · 0,5 h = 1 kWh.',
    },
  },
};
