// Personer, steder og butikkvarer i Story Mode. Alle personer og firmaer er oppdiktet.
import type { Character, Location, ShopItem } from './types';

export const CHARACTERS: Character[] = [
  { id: 'trond', name: 'Trond Bakke', role: 'Lærer, elektro Vg1', personality: 'Rolig og grundig. Sier alltid «sikkerhet først, så fart». Har jobbet som elektriker i tjue år før han ble lærer.', color: '#3b82f6', avatar: '👨‍🏫' },
  { id: 'mari', name: 'Mari Solberg', role: 'Verkstedlærer', personality: 'Energisk og praktisk, med mye humor. Elsker godt verktøy og ryddige koblingsbokser.', color: '#f59e0b', avatar: '👩‍🔧' },
  { id: 'jonas', name: 'Jonas Berg', role: 'Klassekamerat', personality: 'Kjapp og morsom, men tar gjerne snarveier. Blir lett utålmodig.', color: '#ef4444', avatar: '🧑' },
  { id: 'amina', name: 'Amina Yusuf', role: 'Klassekamerat', personality: 'Strukturert og hjelpsom. Skriver alltid gode notater og spør når hun er usikker.', color: '#22c55e', avatar: '👩' },
  { id: 'ivar', name: 'Ivar Hope', role: 'Lærer, Vg2 elenergi', personality: 'Streng, men rettferdig. Brenner for automasjon og motorstyring.', color: '#8b5cf6', avatar: '🧔' },
  { id: 'hanne', name: 'Hanne Lie', role: 'Daglig leder, Lynkobling AS', personality: 'Krevende og rask. Verdsetter god kundeservice og ryddig dokumentasjon.', color: '#06b6d4', avatar: '👩‍💼' },
  { id: 'per', name: 'Per Kristiansen', role: 'Eier, Nordlys Elektro', personality: 'Gammel ringrev med mange historier. Opptatt av håndverk og tålmodighet.', color: '#a16207', avatar: '👴' },
  { id: 'geir', name: 'Geir Dahl', role: 'Montør og fadder', personality: 'Erfaren og tørrvittig. Lærer bort mye – hvis du hører etter.', color: '#64748b', avatar: '👷' },
  { id: 'tor', name: 'Tor Haugen', role: 'Lagersjef, Elektrogrossisten', personality: 'Blid og effektiv. Kan lagernummeret på alt som finnes.', color: '#84cc16', avatar: '🧑‍🏭' },
  { id: 'emil', name: 'Emil Strand', role: 'Ny lærling', personality: 'Nervøs og ivrig. Trenger noen som viser vei.', color: '#ec4899', avatar: '🧑‍🎓' },
  { id: 'olsen', name: 'Fru Olsen', role: 'Kunde', personality: 'Pratsom pensjonist med en katt som heter Kortslutning.', color: '#d946ef', avatar: '👵' },
  { id: 'hansen', name: 'Familien Hansen', role: 'Kunde', personality: 'Travel småbarnsfamilie som har prøvd å «fikse» elektrisk selv.', color: '#14b8a6', avatar: '👨‍👩‍👧' },
  { id: 'jensen', name: 'Bakermester Jensen', role: 'Kunde', personality: 'Står opp klokka fire og vil ha lyset til å virke NÅ.', color: '#f97316', avatar: '🧑‍🍳' },
  { id: 'sensor', name: 'Ingrid Moe', role: 'Prøvenemnd (i spillet)', personality: 'Saklig og grundig. Ser etter sikkerhet, kvalitet og dokumentasjon.', color: '#0ea5e9', avatar: '🧑‍⚖️' },
  { id: 'deg', name: 'Deg', role: '', personality: '', color: '#60a5fa', avatar: '🙂' },
  { id: 'forteller', name: '', role: '', personality: '', color: '#94a3b8', avatar: '📖' },
];

export const LOCATIONS: Location[] = [
  { id: 'hjem', name: 'Hybelen', description: 'Her hviler du, ser over fremgangen og planlegger neste dag.', icon: '🏠' },
  { id: 'skole', name: 'Skolen – klasserommet', description: 'Teori, prøver og samtaler med læreren.', icon: '🏫', if: { stage: ['vg1', 'vg2'] } },
  { id: 'verksted', name: 'Skoleverkstedet', description: 'Praktiske øvinger på trygge øvingstavler med lav spenning.', icon: '🛠️', if: { stage: ['vg1', 'vg2'] } },
  { id: 'butikk', name: 'Verktøybutikken', description: 'Kjøp verktøy, måleinstrumenter og verneutstyr.', icon: '🛒' },
  { id: 'grossist', name: 'Elektrogrossisten', description: 'Ekstrajobber på lageret – gode for lommeboka.', icon: '📦' },
  { id: 'bedrift', name: 'Elektrobedriften', description: 'Kontoret og lageret hos arbeidsgiveren din.', icon: '🏢', if: { flag: 'kontrakt' } },
  { id: 'byggeplass', name: 'Byggeplassen', description: 'Nye boliger under bygging. Hjelm og vernesko påbudt.', icon: '🏗️', if: { stage: ['laerling1', 'laerling2', 'fagarbeider'] } },
  { id: 'kunder', name: 'Kundebesøk', description: 'Oppdrag hjemme hos kunder og i bedrifter.', icon: '🚐', if: { stage: ['laerling1', 'laerling2', 'fagarbeider'] } },
  { id: 'provested', name: 'Prøvestedet', description: 'Her avlegges fagprøven i spillet.', icon: '🏅', if: { flag: 'fagprove_klar' } },
];

export const SHOP: ShopItem[] = [
  { id: 'vernebriller', name: 'Vernebriller', price: 150, category: 'verneutstyr', description: 'Beskytter øynene mot sprut, spon og lysbue. Kreves på verkstedet.' },
  { id: 'skrutrekkere', name: 'Isolert skrutrekkersett', price: 450, category: 'verktøy', description: 'Skrutrekkere med isolert skaft, merket for elektroarbeid.' },
  { id: 'avisoleringstang', name: 'Avisoleringstang', price: 350, category: 'verktøy', description: 'Fjerner isolasjon uten å skade lederen.' },
  { id: 'multimeter', name: 'Multimeter (CAT III)', price: 900, category: 'måleinstrument', description: 'Måler spenning, strøm og resistans. Trengs til feilsøkingsoppdrag.' },
  { id: 'spenningsprover', name: 'Topolet spenningsprøver', price: 700, category: 'måleinstrument', description: 'For kontroll av spenningsløshet. Kontroller den alltid mot kjent kilde før og etter bruk.' },
  { id: 'kontrolltester', name: 'Kontrolltester for stikkontakter', price: 300, category: 'måleinstrument', description: 'Viser om en stikkontakt har spenning og jord.' },
  { id: 'hodelykt', name: 'Hodelykt', price: 250, category: 'annet', description: 'Lys der du jobber, og hendene fri. Gjør nattjobber lettere.' },
  { id: 'verktoyveske', name: 'Verktøyveske', price: 600, category: 'annet', description: 'Orden i verktøyet gir +omdømme hos kunder.' },
  { id: 'tangamperemeter', name: 'Tangamperemeter', price: 1400, category: 'måleinstrument', description: 'Måler strøm uten å bryte kretsen. Trengs til enkelte lærlingoppdrag.', if: { stage: ['laerling1', 'laerling2', 'fagarbeider'] } },
  { id: 'isolasjonsmaler', name: 'Installasjonstester', price: 6500, category: 'måleinstrument', description: 'Kombinert tester for kontroll av nye installasjoner. Kreves til fagprøven i spillet.', if: { stage: ['laerling2', 'fagarbeider'] } },
  { id: 'arbeidsklaer', name: 'Arbeidsklær og vernesko', price: 1200, category: 'verneutstyr', description: 'Påkrevd på byggeplassen.' },
];

export const char = (id: string) => CHARACTERS.find((c) => c.id === id);
export const loc = (id: string) => LOCATIONS.find((l) => l.id === id);
export const shopItem = (id: string) => SHOP.find((s) => s.id === id);
