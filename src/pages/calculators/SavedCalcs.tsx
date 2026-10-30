import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Empty, confirmAction, toast } from '../../components/ui';
import { useProjects } from '../../store/projects';
import { formatDateTime } from '../../utils/id';

export function SavedCalcs() {
  const current = useProjects((s) => s.current);
  const update = useProjects((s) => s.update);
  if (!current) {
    return (
      <Empty>
        Ingen prosjekt er åpent. <Link to="/prosjekter">Åpne eller opprett et prosjekt</Link> for å lagre og se beregninger.
      </Empty>
    );
  }
  if (current.calculations.length === 0) {
    return <Empty>Ingen beregninger er lagret i «{current.name}» ennå. Bruk «Lagre i prosjekt» under en utregning.</Empty>;
  }
  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="muted" style={{ margin: 0 }}>
        Lagrede beregninger i «{current.name}» ({current.calculations.length})
      </p>
      {current.calculations.map((c) => (
        <div className="card" key={c.id}>
          <div className="row">
            <strong>{c.title}</strong>
            <span className="badge">{c.calcType}</span>
            <span className="spacer" />
            <span className="small muted">{formatDateTime(c.createdAt)}</span>
            <button
              type="button"
              className="icon-btn"
              title="Slett beregning"
              aria-label="Slett beregning"
              onClick={() => {
                if (!confirmAction(`Slette beregningen «${c.title}»?`)) return;
                update((p) => {
                  p.calculations = p.calculations.filter((x) => x.id !== c.id);
                });
                toast('Beregningen er slettet');
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <pre className="calc-saved-text mono">{c.result}</pre>
        </div>
      ))}
    </div>
  );
}
