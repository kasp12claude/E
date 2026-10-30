import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Zap } from 'lucide-react';
import { NAV } from '../components/Layout';
import { NewProjectModal } from '../components/NewProjectModal';
import { useProjects } from '../store/projects';
import { formatDateTime } from '../utils/id';
import { SafetyNotice } from '../components/ui';
import './pages.css';

const DESCRIPTIONS: Record<string, string> = {
  'Nytt prosjekt': 'Start et nytt elektroprosjekt med skjema, plantegning og dokumentasjon.',
  'Mine prosjekter': 'Åpne, dupliser, eksporter og organiser prosjektene dine.',
  Tegneverktøy: 'Stort tegneområde med symboler, ledninger, tekst, mål og eksport.',
  Koblingsskjema: 'Enlinje, flerlinje, styrestrøm, effektstrøm, motorstyring og mer.',
  Installasjonsplanlegging: 'Plantegning med rom, vegger, lamper, brytere, uttak og kabelruter.',
  Simulering: 'Trygg, virtuell lavspenningskrets med brytere, lamper og reléer.',
  Prosjektplanlegger: 'Oppgaver, sjekklister, materialer, verktøy og fremdriftsplan.',
  Dokumentasjon: 'Rapporter med HMS, risikovurdering, måleresultater og PDF-eksport.',
  Komponentbibliotek: 'Symboler med beskrivelse, tekniske egenskaper og kilde.',
  Beregninger: 'Ohms lov, effekt, serie/parallell, energi, AC og trefase – trinn for trinn.',
  'Lær elektro': 'Symboltrening, feilsøking, HMS-spørsmål og motorstyringsteori.',
  'Story Mode': 'Elektrokarrieren min: fra Vg1-elev til fagarbeider i spillet – med lærere, oppdrag, valg og egen lønn.',
  Elektrikerspillet: 'Gå rundt i 3D som elektriker, koble opp lys i kundenes hus – og jobb trygt.',
  Innstillinger: 'Navn, skole, rutenett, lagring og sikkerhetskopi.',
};

export default function HomePage() {
  const summaries = useProjects((s) => s.summaries);
  const open = useProjects((s) => s.open);
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-logo">
          <Zap size={34} color="#fff" fill="#fff" />
        </div>
        <div>
          <h1 style={{ marginBottom: 4 }}>Velkommen til ElektroStudio</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
            Tegn koblingsskjema og installasjonsplaner, planlegg prosjekter, regn ut, dokumenter og lær elektro – alt på ett sted. Alt lagres automatisk i nettleseren din.
          </p>
        </div>
      </section>

      <div className="grid grid-auto" style={{ marginBottom: 28 }}>
        {NAV.filter((n) => !('section' in n) && n.label !== 'Forside').map((n) => {
          if ('section' in n) return null;
          const Icon = n.icon;
          const inner = (
            <>
              <div className="tile-icon">
                <Icon size={22} />
              </div>
              <div className="tile-title">{n.label}</div>
              <div className="tile-desc">{DESCRIPTIONS[n.label]}</div>
            </>
          );
          return 'action' in n ? (
            <a key={n.label} href="#" className="tile" onClick={(e) => (e.preventDefault(), setNewOpen(true))}>
              {inner}
            </a>
          ) : (
            <Link key={n.label} to={n.to} className="tile">
              {inner}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            <Clock size={18} /> Sist brukte prosjekter
          </div>
          {summaries.length === 0 ? (
            <p className="muted">
              Du har ingen prosjekter ennå.{' '}
              <a href="#" onClick={(e) => (e.preventDefault(), setNewOpen(true))}>
                Lag ditt første prosjekt
              </a>
              .
            </p>
          ) : (
            <div className="col">
              {summaries.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  className="list-row"
                  onClick={async () => {
                    await open(s.id);
                    navigate(`/prosjekt/${s.id}`);
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span className="muted small">
                    {s.docCount} tegninger · {formatDateTime(s.updatedAt)}
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">Kom i gang</div>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Lag et nytt prosjekt og velg skjematype.</li>
            <li>Dra komponenter fra biblioteket inn på arket.</li>
            <li>Dra fra en terminal (liten sirkel) for å tegne ledning.</li>
            <li>Gi komponentene betegnelser (F1, Q1, K1 …) i egenskapspanelet.</li>
            <li>Trykk «Kontroller» for å se om alle ledninger er koblet til.</li>
            <li>Eksporter til PDF, PNG eller SVG – eller skriv ut.</li>
          </ol>
          <p className="small muted" style={{ marginTop: 10 }}>
            Trykk <kbd>?</kbd> i tegneområdet for å se alle hurtigtaster.
          </p>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <SafetyNotice />
      </div>
      {newOpen && <NewProjectModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}
