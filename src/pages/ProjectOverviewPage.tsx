import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calculator, ClipboardList, Cpu, FileText, LayoutGrid, PencilRuler, Plus, Waypoints } from 'lucide-react';
import { useProjects } from '../store/projects';
import { Empty, Field, PageHeader, Progress } from '../components/ui';
import { DocCard } from './DocLauncherPage';
import { formatDateTime } from '../utils/id';
import type { DocKind } from '../types';
import './pages.css';

export default function ProjectOverviewPage() {
  const { pid } = useParams();
  const { current, open, update, addDoc } = useProjects();
  const [missing, setMissing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (pid && current?.id !== pid) void open(pid).then((p) => setMissing(!p));
  }, [pid, current?.id, open]);

  if (missing)
    return (
      <div className="page">
        <h2>Fant ikke prosjektet</h2>
        <Link to="/prosjekter">Til Mine prosjekter</Link>
      </div>
    );
  if (!current || current.id !== pid) return <div className="page muted">Laster …</div>;
  const p = current;
  const tasks = p.plan.tasks;
  const done = tasks.filter((t) => t.status === 'ferdig').length;
  const create = (kind: DocKind, name: string) => {
    const d = addDoc(kind, name, kind === 'schematic' ? 'prinsipp' : undefined);
    if (d) navigate(`/prosjekt/${p.id}/tegning/${d.id}`);
  };
  const groups: { kind: DocKind; title: string; icon: typeof Waypoints; newName: string }[] = [
    { kind: 'schematic', title: 'Koblingsskjema', icon: Waypoints, newName: 'Koblingsskjema' },
    { kind: 'floorplan', title: 'Plantegninger', icon: LayoutGrid, newName: 'Plantegning' },
    { kind: 'drawing', title: 'Tegninger', icon: PencilRuler, newName: 'Tegning' },
    { kind: 'simulation', title: 'Simuleringer', icon: Cpu, newName: 'Simulering' },
  ];

  return (
    <div className="page">
      <PageHeader
        title={p.name}
        description={`Opprettet ${formatDateTime(p.createdAt)} · sist endret ${formatDateTime(p.updatedAt)}`}
        actions={
          <>
            <Link className="btn" to="/planlegging">
              <ClipboardList size={16} /> Prosjektplan
            </Link>
            <Link className="btn" to="/dokumentasjon">
              <FileText size={16} /> Rapporter
            </Link>
          </>
        }
      />
      <div className="overview-stats">
        <div className="stat">
          <b>{p.docs.filter((d) => d.kind === 'schematic').length}</b>
          <span>Koblingsskjema</span>
        </div>
        <div className="stat">
          <b>{p.docs.filter((d) => d.kind === 'floorplan').length}</b>
          <span>Plantegninger</span>
        </div>
        <div className="stat">
          <b>{p.reports.length}</b>
          <span>Rapporter</span>
        </div>
        <div className="stat">
          <b>{p.calculations.length}</b>
          <span>Lagrede beregninger</span>
        </div>
        <div className="stat">
          <b>{p.attachments.length}</b>
          <span>Vedlegg</span>
        </div>
        <div className="stat">
          <b>
            {done}/{tasks.length}
          </b>
          <span>Oppgaver ferdig</span>
          <div style={{ marginTop: 6 }}>
            <Progress value={tasks.length ? done / tasks.length : 0} />
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <Field label="Prosjektnavn">
            <input className="input" value={p.name} onChange={(e) => update((d) => void (d.name = e.target.value))} />
          </Field>
          <Field label="Beskrivelse">
            <textarea className="textarea" rows={3} value={p.description} onChange={(e) => update((d) => void (d.description = e.target.value))} />
          </Field>
        </div>
        <div className="card">
          <Field label="Notater">
            <textarea className="textarea" rows={6} value={p.notes} placeholder="Egne notater til prosjektet …" onChange={(e) => update((d) => void (d.notes = e.target.value))} />
          </Field>
        </div>
      </div>

      {groups.map((g) => {
        const docs = p.docs.filter((d) => d.kind === g.kind);
        const Icon = g.icon;
        return (
          <section key={g.kind} style={{ marginBottom: 24 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <h2 className="row" style={{ margin: 0, gap: 8 }}>
                <Icon size={20} color="var(--accent-2)" /> {g.title}
              </h2>
              <span className="spacer" />
              <button className="btn btn-sm" onClick={() => create(g.kind, `${g.newName} ${docs.length + 1}`)}>
                <Plus size={14} /> Ny
              </button>
            </div>
            {docs.length === 0 ? (
              <Empty>Ingen ennå.</Empty>
            ) : (
              <div className="grid grid-auto">
                {docs.map((d) => (
                  <DocCard key={d.id} doc={d} projectId={p.id} projectName={p.name} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {p.calculations.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 className="row" style={{ gap: 8 }}>
            <Calculator size={20} color="var(--accent-2)" /> Lagrede beregninger
          </h2>
          <div className="grid grid-auto">
            {p.calculations.map((c) => (
              <div key={c.id} className="card">
                <b>{c.title}</b>
                <pre className="small mono" style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0', color: 'var(--muted)' }}>
                  {c.result}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
