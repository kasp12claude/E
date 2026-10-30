import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PlanTask, Project, TaskStatus } from '../../types';
import { Empty, confirmAction } from '../../components/ui';
import { todayIso, uid } from '../../utils/id';
import { STATUS_LABEL, isOverdue } from './plannerUtils';
import type { PlanUpdater } from './PlannerPage';

type Filter = 'alle' | 'aktive' | 'forsinket' | TaskStatus;

export function TasksTab({ project, upd }: { project: Project; upd: PlanUpdater }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [filter, setFilter] = useState<Filter>('alle');
  const [sortByDue, setSortByDue] = useState(false);
  const today = todayIso();
  const tasks = project.plan.tasks;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const t: PlanTask = { id: uid('task'), title: title.trim(), description: '', status: 'ikke-startet', due: due || undefined, start: today };
    upd((pl) => void pl.tasks.push(t));
    setTitle('');
    setDue('');
  };

  const set = (id: string, patch: Partial<PlanTask>) =>
    upd((pl) => {
      const t = pl.tasks.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
    });

  let shown = tasks.filter((t) =>
    filter === 'alle' ? true : filter === 'aktive' ? t.status !== 'ferdig' : filter === 'forsinket' ? isOverdue(t, today) : t.status === filter,
  );
  if (sortByDue) shown = [...shown].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));

  return (
    <div className="col" style={{ gap: 14 }}>
      <form className="card row" onSubmit={add}>
        <input className="input" style={{ flex: 2, minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ny arbeidsoppgave, f.eks. «Trekke kabel til garasjen»" />
        <label className="row small muted" style={{ gap: 6 }}>
          Frist
          <input className="input" type="date" style={{ width: 160 }} value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!title.trim()}>
          <Plus size={16} /> Legg til oppgave
        </button>
      </form>

      <div className="row">
        <label className="row small muted" style={{ gap: 6 }}>
          Vis
          <select className="select" style={{ width: 170 }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="alle">Alle oppgaver</option>
            <option value="aktive">Ikke ferdige</option>
            <option value="forsinket">Forsinkede</option>
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                Status: {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox small">
          <input type="checkbox" checked={sortByDue} onChange={(e) => setSortByDue(e.target.checked)} /> Sorter etter frist
        </label>
        <span className="spacer" />
        <span className="small muted">
          {shown.length} av {tasks.length} oppgaver
        </span>
      </div>

      {tasks.length === 0 ? (
        <Empty>Ingen oppgaver ennå. Del prosjektet opp i konkrete arbeidsoppgaver med frister.</Empty>
      ) : shown.length === 0 ? (
        <Empty>Ingen oppgaver passer filteret.</Empty>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {shown.map((t) => {
            const late = isOverdue(t, today);
            return (
              <div key={t.id} className={`card task-card status-${t.status} ${late ? 'late' : ''}`}>
                <div className="task-main">
                  <input
                    type="checkbox"
                    title="Marker som ferdig"
                    checked={t.status === 'ferdig'}
                    onChange={(e) => set(t.id, { status: e.target.checked ? 'ferdig' : 'pagar' })}
                  />
                  <input className="input task-title" value={t.title} onChange={(e) => set(t.id, { title: e.target.value })} aria-label="Tittel" />
                  {late && <span className="badge badge-red">Forsinket</span>}
                  <select className="select" style={{ width: 140 }} value={t.status} onChange={(e) => set(t.id, { status: e.target.value as TaskStatus })} aria-label="Status">
                    {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="icon-btn"
                    title="Slett oppgave"
                    onClick={() => confirmAction(`Slette oppgaven «${t.title}»?`) && upd((pl) => void (pl.tasks = pl.tasks.filter((x) => x.id !== t.id)))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="task-details">
                  <label>
                    <span className="label">Start</span>
                    <input className="input" type="date" value={t.start ?? ''} onChange={(e) => set(t.id, { start: e.target.value || undefined })} />
                  </label>
                  <label>
                    <span className="label">Frist</span>
                    <input className="input" type="date" value={t.due ?? ''} onChange={(e) => set(t.id, { due: e.target.value || undefined })} />
                  </label>
                  <label>
                    <span className="label">Ansvarlig</span>
                    <input className="input" value={t.responsible ?? ''} onChange={(e) => set(t.id, { responsible: e.target.value })} placeholder="Navn" />
                  </label>
                  <label className="task-desc">
                    <span className="label">Beskrivelse</span>
                    <textarea className="textarea" rows={1} value={t.description} onChange={(e) => set(t.id, { description: e.target.value })} placeholder="Detaljer, fremgangsmåte …" />
                  </label>
                </div>
                {t.start && t.due && t.due < t.start && <div className="small text-danger">Fristen er før startdatoen.</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
