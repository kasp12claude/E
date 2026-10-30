import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, FileText, LayoutGrid, Plus, Waypoints, PencilRuler, Cpu } from 'lucide-react';
import type { DocKind, Project } from '../../types';
import { useProjects } from '../../store/projects';
import { DOC_KIND_LABEL, modeName } from '../../store/factories';
import { Field, Progress } from '../../components/ui';
import { formatDate, todayIso } from '../../utils/id';
import { STATUS_BADGE, STATUS_LABEL, isOverdue } from './plannerUtils';
import type { PlanUpdater, TabId } from './PlannerPage';

const KIND_ICON: Record<DocKind, typeof Waypoints> = {
  schematic: Waypoints,
  floorplan: LayoutGrid,
  drawing: PencilRuler,
  simulation: Cpu,
};

export function OverviewTab({ project, upd, goTo }: { project: Project; upd: PlanUpdater; goTo: (t: TabId) => void }) {
  const update = useProjects((s) => s.update);
  const addDoc = useProjects((s) => s.addDoc);
  const navigate = useNavigate();
  const plan = project.plan;
  const today = todayIso();

  const tasks = plan.tasks;
  const done = tasks.filter((t) => t.status === 'ferdig').length;
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const upcoming = tasks
    .filter((t) => t.due && t.status !== 'ferdig' && t.due >= today)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 5);
  const checkItems = plan.checklists.flatMap((c) => c.items);
  const checkDone = checkItems.filter((i) => i.done).length;
  const missingTools = plan.tools.filter((t) => !t.have).length;
  const daysLeft = plan.endDate ? Math.round((new Date(`${plan.endDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000) : null;

  const createDoc = (kind: DocKind) => {
    const n = project.docs.filter((d) => d.kind === kind).length + 1;
    const doc = addDoc(kind, `${DOC_KIND_LABEL[kind]} ${n}`, kind === 'schematic' ? 'prinsipp' : undefined);
    if (doc) navigate(`/prosjekt/${project.id}/tegning/${doc.id}`);
  };

  const docsOf = (kinds: DocKind[]) => project.docs.filter((d) => kinds.includes(d.kind));

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">Prosjekt</div>
          <Field label="Prosjektnavn">
            <input className="input" value={project.name} onChange={(e) => update((p) => void (p.name = e.target.value))} />
          </Field>
          <Field label="Beskrivelse">
            <textarea className="textarea" rows={3} value={project.description} onChange={(e) => update((p) => void (p.description = e.target.value))} placeholder="Hva skal lages, hvor og for hvem?" />
          </Field>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <Field label="Startdato">
              <input className="input" type="date" value={plan.startDate ?? ''} onChange={(e) => upd((pl) => void (pl.startDate = e.target.value || undefined))} />
            </Field>
            <Field label="Sluttdato / frist">
              <input className="input" type="date" value={plan.endDate ?? ''} onChange={(e) => upd((pl) => void (pl.endDate = e.target.value || undefined))} />
            </Field>
          </div>
          {daysLeft !== null && (
            <div className={`small ${daysLeft < 0 ? 'text-danger' : 'muted'}`}>
              {daysLeft < 0 ? `Sluttdatoen var for ${-daysLeft} dager siden.` : daysLeft === 0 ? 'Sluttdatoen er i dag.' : `${daysLeft} dager igjen til sluttdato.`}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Fremdrift</div>
          <div className="stat-big">{tasks.length ? Math.round((done / tasks.length) * 100) : 0} %</div>
          <Progress value={tasks.length ? done / tasks.length : 0} />
          <div className="stat-grid">
            <button className="stat" onClick={() => goTo('oppgaver')}>
              <b>{done}</b> ferdig
            </button>
            <button className="stat" onClick={() => goTo('oppgaver')}>
              <b>{tasks.length - done}</b> gjenstår
            </button>
            <button className={`stat ${overdue.length ? 'stat-warn' : ''}`} onClick={() => goTo('oppgaver')}>
              <b>{overdue.length}</b> forsinket
            </button>
            <button className="stat" onClick={() => goTo('sjekklister')}>
              <b>
                {checkDone}/{checkItems.length}
              </b>{' '}
              sjekkpunkter
            </button>
            <button className="stat" onClick={() => goTo('materialer')}>
              <b>{plan.materials.length}</b> materiallinjer
            </button>
            <button className={`stat ${missingTools ? 'stat-warn' : ''}`} onClick={() => goTo('verktoy')}>
              <b>{missingTools}</b> verktøy mangler
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            <AlertTriangle size={17} color="var(--warn)" /> Forsinkede oppgaver
          </div>
          {overdue.length === 0 ? (
            <div className="muted small">Ingen forsinkede oppgaver.</div>
          ) : (
            <ul className="plain-list">
              {overdue.map((t) => (
                <li key={t.id}>
                  <span className="badge badge-red">Frist {formatDate(t.due!)}</span> {t.title || '(uten tittel)'} <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-title">
            <CalendarClock size={17} /> Neste frister
          </div>
          {upcoming.length === 0 ? (
            <div className="muted small">Ingen kommende frister. Sett frist på oppgavene under «Oppgaver».</div>
          ) : (
            <ul className="plain-list">
              {upcoming.map((t) => (
                <li key={t.id}>
                  <span className="badge badge-blue">{formatDate(t.due!)}</span> {t.title || '(uten tittel)'}
                  {t.responsible && <span className="muted small"> – {t.responsible}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Tegninger og dokumentasjon i prosjektet</div>
        <div className="grid grid-3" style={{ gap: 14 }}>
          {(
            [
              ['Plantegninger', ['floorplan'], 'floorplan'],
              ['Koblingsskjemaer', ['schematic'], 'schematic'],
              ['Andre tegninger og simuleringer', ['drawing', 'simulation'], 'drawing'],
            ] as [string, DocKind[], DocKind][]
          ).map(([title, kinds, newKind]) => (
            <div key={title}>
              <div className="label" style={{ marginBottom: 6 }}>
                {title}
              </div>
              {docsOf(kinds).length === 0 && <div className="muted small" style={{ marginBottom: 6 }}>Ingen ennå.</div>}
              <div className="col" style={{ gap: 4, marginBottom: 8 }}>
                {docsOf(kinds).map((d) => {
                  const Icon = KIND_ICON[d.kind];
                  return (
                    <Link key={d.id} to={`/prosjekt/${project.id}/tegning/${d.id}`} className="doc-link">
                      <Icon size={15} /> {d.name}
                      {d.kind === 'schematic' && <span className="muted small"> · {modeName(d.mode)}</span>}
                    </Link>
                  );
                })}
              </div>
              <button className="btn btn-sm" onClick={() => createDoc(newKind)}>
                <Plus size={14} /> Ny {DOC_KIND_LABEL[newKind].toLowerCase()}
              </button>
            </div>
          ))}
        </div>
        <hr className="sep" />
        <div className="row">
          <FileText size={16} />
          <span>
            {project.reports.length} rapport(er) i prosjektet. <Link to="/dokumentasjon">Gå til dokumentasjon</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
