import type { Project } from '../../types';
import { Empty, Notice } from '../../components/ui';
import { formatDate, todayIso } from '../../utils/id';
import { STATUS_COLOR, STATUS_LABEL, addDays, daysBetween, isOverdue, parseIso } from './plannerUtils';
import type { PlanUpdater } from './PlannerPage';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

export function GanttTab({ project }: { project: Project; upd: PlanUpdater }) {
  const plan = project.plan;
  const today = todayIso();
  const dated = plan.tasks
    .filter((t) => t.start || t.due)
    .map((t) => {
      let s = t.start ?? t.due!;
      let e = t.due ?? t.start!;
      if (e < s) [s, e] = [e, s];
      return { t, s, e };
    })
    .sort((a, b) => a.s.localeCompare(b.s));
  const undated = plan.tasks.filter((t) => !t.start && !t.due);

  if (dated.length === 0) {
    return (
      <Empty>
        Ingen oppgaver har datoer ennå. Sett start og frist på oppgavene under «Oppgaver» for å se fremdriftsplanen.
        {undated.length > 0 && <div className="small" style={{ marginTop: 6 }}>{undated.length} oppgave(r) mangler datoer.</div>}
      </Empty>
    );
  }

  let min = dated.reduce((m, d) => (d.s < m ? d.s : m), dated[0].s);
  let max = dated.reduce((m, d) => (d.e > m ? d.e : m), dated[0].e);
  if (plan.startDate && plan.startDate < min) min = plan.startDate;
  if (plan.endDate && plan.endDate > max) max = plan.endDate;
  min = addDays(min, -1);
  max = addDays(max, 1);
  const days = daysBetween(min, max) + 1;
  const pct = (d: string) => (daysBetween(min, d) / days) * 100;

  // Tidslinje-merker: månedsstart og mandager (hvis ikke for mange)
  const ticks: { pos: number; label: string; major: boolean }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(min, i);
    const dt = parseIso(d);
    if (dt.getDate() === 1 || i === 0) ticks.push({ pos: (i / days) * 100, label: `${dt.getDate()}. ${MONTHS[dt.getMonth()]}`, major: true });
    else if (dt.getDay() === 1 && days <= 120) ticks.push({ pos: (i / days) * 100, label: days <= 60 ? `${dt.getDate()}.` : '', major: false });
  }
  const showToday = today >= min && today <= max;

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="card gantt">
        <div className="gantt-row gantt-head">
          <div className="gantt-label small muted">Oppgave</div>
          <div className="gantt-track">
            {ticks.map((t, i) => (
              <span key={i} className={`gantt-tick ${t.major ? 'major' : ''}`} style={{ left: `${t.pos}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
        {plan.startDate || plan.endDate ? (
          <div className="gantt-row">
            <div className="gantt-label" style={{ fontWeight: 600 }}>
              Hele prosjektet
            </div>
            <div className="gantt-track">
              <div
                className="gantt-bar project"
                style={{ left: `${pct(plan.startDate ?? min)}%`, width: `${((daysBetween(plan.startDate ?? min, plan.endDate ?? max) + 1) / days) * 100}%` }}
                title={`${plan.startDate ? formatDate(plan.startDate) : '?'} – ${plan.endDate ? formatDate(plan.endDate) : '?'}`}
              />
            </div>
          </div>
        ) : null}
        {dated.map(({ t, s, e }) => (
          <div key={t.id} className="gantt-row">
            <div className="gantt-label" title={t.title}>
              {t.title || '(uten tittel)'}
            </div>
            <div className="gantt-track">
              {ticks.filter((k) => k.major).map((k, i) => (
                <span key={i} className="gantt-grid" style={{ left: `${k.pos}%` }} />
              ))}
              <div
                className={`gantt-bar ${isOverdue(t, today) ? 'late' : ''}`}
                style={{ left: `${pct(s)}%`, width: `${Math.max(0.8, ((daysBetween(s, e) + 1) / days) * 100)}%`, background: STATUS_COLOR[t.status] }}
                title={`${t.title}\n${formatDate(s)} – ${formatDate(e)}\n${STATUS_LABEL[t.status]}`}
              />
            </div>
          </div>
        ))}
        {showToday && (
          <div className="gantt-today-wrap">
            <div className="gantt-today" style={{ left: `${pct(today)}%` }} title="I dag" />
          </div>
        )}
      </div>
      <div className="row small muted">
        {(Object.keys(STATUS_COLOR) as (keyof typeof STATUS_COLOR)[]).map((s) => (
          <span key={s} className="row" style={{ gap: 4 }}>
            <span className="legend-dot" style={{ background: STATUS_COLOR[s] }} /> {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="row" style={{ gap: 4 }}>
          <span className="legend-dot" style={{ background: 'var(--warn)', width: 2, height: 12, borderRadius: 0 }} /> I dag
        </span>
      </div>
      {undated.length > 0 && <Notice kind="info">{undated.length} oppgave(r) mangler datoer og vises ikke i fremdriftsplanen.</Notice>}
    </div>
  );
}
