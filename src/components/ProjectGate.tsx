import { useEffect, useState, type ReactNode } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../store/projects';
import type { Project } from '../types';
import { Empty, Field } from './ui';
import { formatDateTime } from '../utils/id';

/**
 * Sørger for at et prosjekt er åpent. Hvis ikke vises en velger for å åpne eller lage prosjekt.
 * Bruk: <ProjectGate>{(project) => ...}</ProjectGate>
 */
export function ProjectGate({ children, purpose }: { children: (p: Project) => ReactNode; purpose?: string }) {
  const { current, activeId, open, loaded, refresh } = useProjects();
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!loaded) void refresh();
  }, [loaded, refresh]);
  useEffect(() => {
    if (!current && activeId && !tried) {
      setTried(true);
      void open(activeId);
    } else if (!activeId) setTried(true);
  }, [current, activeId, open, tried]);

  if (current) return <>{children(current)}</>;
  if (!tried) return <div className="page muted">Laster prosjekt …</div>;
  return <ProjectPicker purpose={purpose} />;
}

export function ProjectPicker({ purpose }: { purpose?: string }) {
  const { summaries, open, create } = useProjects();
  const [name, setName] = useState('');
  const navigate = useNavigate();
  return (
    <div className="page page-narrow">
      <h1>Velg prosjekt</h1>
      <p className="muted">{purpose ?? 'Denne funksjonen lagres i et prosjekt.'} Åpne et eksisterende prosjekt eller lag et nytt.</p>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-title">
            <Plus size={18} /> Nytt prosjekt
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await create(name || 'Nytt prosjekt');
            }}
          >
            <Field label="Prosjektnavn">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="F.eks. Trappelys garasje" autoFocus />
            </Field>
            <button className="btn btn-primary" type="submit">
              Opprett og fortsett
            </button>
          </form>
        </div>
        <div className="card">
          <div className="card-title">
            <FolderOpen size={18} /> Mine prosjekter
          </div>
          {summaries.length === 0 ? (
            <Empty>Ingen prosjekter ennå.</Empty>
          ) : (
            <div className="col" style={{ maxHeight: 320, overflow: 'auto' }}>
              {summaries.map((s) => (
                <button key={s.id} className="btn" style={{ justifyContent: 'space-between', height: 'auto', padding: '8px 10px' }} onClick={() => open(s.id)}>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span className="small muted">{formatDateTime(s.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/prosjekter')}>
            Gå til prosjektoversikten
          </button>
        </div>
      </div>
    </div>
  );
}
