import { useNavigate } from 'react-router-dom';
import { Copy, FileText, GraduationCap, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../types';
import { useProjects } from '../../store/projects';
import { useSettings } from '../../store/settings';
import { newReport } from '../../store/factories';
import { Empty, Notice, PageHeader, Progress, confirmAction, toast } from '../../components/ui';
import { formatDateTime } from '../../utils/id';
import { cloneReport, reportProgress } from './reportUtils';

export function ReportList({ project }: { project: Project }) {
  const update = useProjects((s) => s.update);
  const { userName, className } = useSettings();
  const navigate = useNavigate();

  const create = (template: 'standard' | 'skole') => {
    const r = newReport(template, userName, className);
    r.title = template === 'skole' ? `Elevrapport – ${project.name}` : `Rapport – ${project.name}`;
    update((p) => {
      p.reports.push(r);
    });
    navigate(`/dokumentasjon/${r.id}`);
  };

  const duplicate = (id: string) => {
    const r = project.reports.find((x) => x.id === id);
    if (!r) return;
    const c = cloneReport(r);
    update((p) => {
      p.reports.push(c);
    });
    toast(`Rapporten er kopiert: «${c.title}»`);
  };

  const remove = (id: string, title: string) => {
    if (!confirmAction(`Slette rapporten «${title}»? Dette kan ikke angres.`)) return;
    update((p) => {
      p.reports = p.reports.filter((r) => r.id !== id);
    });
    toast('Rapporten er slettet');
  };

  const reports = [...project.reports].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="page">
      <PageHeader
        icon={<FileText size={26} color="var(--accent-2)" />}
        title="Dokumentasjon og rapporter"
        description={`Lag rapporter for prosjektet «${project.name}». Rapportene kan inneholde koblingsskjema, plantegninger, bilder, målinger og risikovurdering, og eksporteres som PDF.`}
        actions={
          <>
            <button className="btn" onClick={() => create('standard')}>
              <Plus size={16} /> Ny rapport (standard)
            </button>
            <button className="btn btn-primary" onClick={() => create('skole')}>
              <GraduationCap size={16} /> Ny elevrapport
            </button>
          </>
        }
      />

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-title">
            <FileText size={18} /> Mal: Standard
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Formål, utstyrs- og komponentliste, beskrivelse, risikovurdering, HMS-sjekkliste, koblingsskjema, plantegning, bilder, måleresultater, feilsøking,
            egenvurdering og konklusjon.
          </p>
        </div>
        <div className="card">
          <div className="card-title">
            <GraduationCap size={18} /> Mal: Skoleprosjekt elektrofag
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Som standardmalen, men med innledning og teoridel. Hver seksjon har hjelpetekst som forklarer hva eleven skal skrive med egne ord.
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <Empty icon={<FileText size={32} />}>
          Ingen rapporter i dette prosjektet ennå. Velg en mal over for å komme i gang.
        </Empty>
      ) : (
        <div className="grid grid-auto">
          {reports.map((r) => {
            const prog = reportProgress(r);
            return (
              <div key={r.id} className="card clickable report-card" onClick={() => navigate(`/dokumentasjon/${r.id}`)}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</div>
                  <span className={`badge ${r.template === 'skole' ? 'badge-blue' : ''}`}>{r.template === 'skole' ? 'Skole' : 'Standard'}</span>
                </div>
                <div className="small muted" style={{ margin: '6px 0 10px' }}>
                  {r.author || 'Ingen forfatter'} · endret {formatDateTime(r.updatedAt)}
                </div>
                <Progress value={prog} />
                <div className="small muted" style={{ marginTop: 4 }}>
                  {Math.round(prog * 100)} % av {r.sections.length} seksjoner utfylt
                </div>
                <div className="row" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => navigate(`/dokumentasjon/${r.id}`)}>
                    Åpne
                  </button>
                  <button className="btn btn-sm" onClick={() => duplicate(r.id)} title="Dupliser">
                    <Copy size={14} /> Dupliser
                  </button>
                  <span className="spacer" />
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r.id, r.title)} title="Slett">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Notice kind="info">
          Rapportene er dokumentasjon av eget arbeid. De er ikke en samsvarserklæring eller godkjenning av en elektrisk installasjon.
        </Notice>
      </div>
    </div>
  );
}
