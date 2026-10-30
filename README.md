# ElektroStudio

En nettside for elektroelever, elektrikere og andre som vil lære elektro. Du kan tegne koblingsskjema og installasjonsplaner, planlegge prosjekter, regne ut, dokumentere og simulere enkle lavspenningskretser. Alt er på norsk bokmål.

> **Sikkerhet:** ElektroStudio er et verktøy for læring og tegning. Simulatoren er en forenklet pedagogisk modell, og koblingskontrollen finner bare tekniske feil i selve tegningen. Ingenting i programmet godkjenner en elektrisk installasjon. Arbeid på virkelige anlegg skal gjøres av kvalifisert personell, etter gjeldende forskrifter og normer.

## Kom i gang

```bash
npm install
npm run dev      # utviklingsserver på http://localhost:5173
npm run build    # typekontroll + produksjonsbygg i dist/
```

## Teknologi og hvorfor

| Bibliotek | Hvorfor |
| --- | --- |
| **React 18 + TypeScript** | Gjenbrukbare komponenter og typesikker datamodell for tegninger og prosjekter. |
| **Vite** | Rask utviklingsserver og enkelt produksjonsbygg. |
| **SVG (egen tegnemotor)** | Skarpe symboler i alle zoomnivåer, og eksport til SVG/PDF i vektorformat. Gir full kontroll over terminaler, ledninger og fest-til-rutenett uten et tungt CAD-bibliotek. |
| **zustand + immer** | Liten og enkel tilstandshåndtering. Immer gjør prosjektoppdateringer trygge og lettleste. |
| **idb (IndexedDB)** | Lokal lagring av prosjekter og vedlegg (bilder) i nettleseren. Tåler mye mer data enn localStorage. |
| **jsPDF + svg2pdf.js** | PDF-eksport av tegninger (vektor) og rapporter. |
| **lucide-react** | Tydelige ikoner med samme stil overalt. |
| **react-router (HashRouter)** | Navigasjon som virker også ved statisk hosting. |

## Prosjektstruktur

```
src/
  types.ts               Datamodell (Project, DrawingDoc, elementer, rapporter, plan)
  storage/               Lagringsgrensesnitt + IndexedDB-implementasjon (kan byttes ut med sky)
  store/                 Prosjekt-store (autolagring), innstillinger, maler/fabrikker
  library/               Symbolbibliotek: navn, symbol, beskrivelse, egenskaper, terminaler, kilde
  editor/                Tegnemotor: lerret, verktøy, angre/gjør om, ledninger, kontroll, eksport
  sim/                   Kretssimulator (nodeanalyse), eksempelkretser, simuleringspanel
  components/            Layout, menyer, felles UI-komponenter
  pages/                 Sider: forside, prosjekter, editor, beregninger, læring, dokumentasjon, planlegger …
```

## Lagring

`src/storage/repository.ts` beskriver et `ProjectRepository`- og et `FileRepository`-grensesnitt. I dag brukes IndexedDB-implementasjonen. Brukerkontoer og skylagring kan legges til ved å lage en ny implementasjon av de samme grensesnittene, uten å endre resten av appen. Prosjekter kan eksporteres og importeres som `.elektro.json`, med vedleggene inkludert.

## Symboler og standarder

Symbolene er tegnet etter prinsippene i IEC 60617, men er forenklede gjengivelser. Hvert symbol har en kildemerknad. Symboler som ikke er standardiserte, er merket som generiske eller forenklede. Bokstavkodene for referansebetegnelser er forslag etter IEC 81346-2 og kan endres. Kontroller alltid mot gjeldende standard ved formell dokumentasjon.
