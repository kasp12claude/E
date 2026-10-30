import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronLeft, FileDown, Loader2, Plus, Printer, Trash2 } from 'lucide-react';
import type { Project, Report, ReportSection } from '../../types';
import { useProjects } from '../../store/projects';
import { useSettings } from '../../store/settings';
import { Empty, Field, Notice, Progress, SafetyNotice, confirmAction, toast } from '../../components/ui';
import { uid } from '../../utils/id';
import { SectionBody, type SectionUpdater } from './SectionEditors';
import { KIND_LABEL, reportProgress } from './reportUtils';
import { exportReportPdf, printReport } from './reportExport';

const NEW_SECTION_KINDS: { kind: ReportSection['kind']; label: string }[] = [
  { kind: 'text', label: 'Tekst' },
  { kind: 'table', label: 'Tabell' },
  { kind: 'checklist', label: 'Sjekkliste' },
  { kind: 'drawing', label: 'Tegning' },
  { kind: 'images', label: 'Bilder' },
];

function blankSection(kind: ReportSection['kind']): ReportSection {
  const base: ReportSection = { id: uid('sec'), title: 'Ny seksjon', kind, text: '' };
  if (kind === 'table') return { ...base, title: 'Ny tabell', columns: ['Kolonne 1', 'Kolonne 2', 'Kolonne 3'], rows: [['', '', '']] };
  if (kind === 'checklist') return { ...base, title: 'Ny sjekkliste', items: [] };
  if (kind === 'drawing') return { ...base, title: 'Tegning', drawingIds: [] };
  if (kind === 'images') return { ...base, title: 'Bilder', imageIds: [] };
  return base;
}

export function ReportEditor({ project }: { project: Project }) {
  const { rid } = useParams();
  const update = useProjects((s) => s.update);
  const flush = useProjects((s) => s.flush);
  const school = useSettings((s) => s.school);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'pdf' | 'print' | null>(null);
  const [newKind, setNewKind] = useState<ReportSection['kind']>('text');
  const report = project.reports.find((r) => r.id === rid);

  if (!report) {
    return (
      <div className="page page-narrow">
        <Empty>
          Fant ikke rapporten i prosjektet «{project.name}». <Link to="/dokumentasjon">Tilbake til rapportlisten</Link>
        </Empty>
      </div>
    );
  }

  const updReport = (fn: (r: Report) => void) =>
    update((p) => {
      const r = p.reports.find((x) => x.id === rid);
      if (r) {
        fn(r);
        r.updatedAt = Date.now();
      }
    });
  const updSection =
    (sid: string): SectionUpdater =>
    (fn) =>
      updReport((r) => {
        const s = r.sections.find((x) => x.id === sid);
        if (s) fn(s);
      });

  const move = (i: number, d: -1 | 1) =>
    updReport((r) => {
      const j = i + d;
      if (j < 0 || j >= r.sections.length) return;
      [r.sections[i], r.sections[j]] = [r.sections[j], r.sections[i]];
    });

  const removeSection = (s: ReportSection) => {
    if (!confirmAction(`Fjerne seksjonen «${s.title}» fra rapporten?`)) return;
    updReport((r) => void (r.sections = r.sections.filter((x) => x.id !== s.id)));
  };

  const run = async (kind: 'pdf' | 'print') => {
    setBusy(kind);
    try {
      await flush();
      const fresh = useProjects.getState().current ?? project;
      const r = fresh.reports.find((x) => x.id === rid) ?? report;
      if (kind === 'pdf') {
        await exportReportPdf(r, fresh, { school });
        toast('PDF er laget');
      } else await printReport(r, fresh, { school });
    } catch (e) {
      console.error(e);
      toast(kind === 'pdf' ? 'PDF-eksport feilet' : 'Utskrift feilet', true);
    } finally {
      setBusy(null);
    }
  };

  const prog = reportProgress(report);

  return (
    <div className="page page-narrow report-editor">
      <div className="report-toolbar no-print">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dokumentasjon')}>
          <ChevronLeft size={16} /> Alle rapporter
        </button>
        <span className="spacer" />
        <button className="btn" onClick={() => run('print')} disabled={!!busy}>
          {busy === 'print' ? <Loader2 size={16} className="spin" /> : <Printer size={16} />} Skriv ut
        </button>
        <button className="btn btn-primary" onClick={() => run('pdf')} disabled={!!busy}>
          {busy === 'pdf' ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />} Eksporter PDF
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input className="input title-input" value={report.title} onChange={(e) => updReport((r) => void (r.title = e.target.value))} aria-label="Rapporttittel" />
        <div className="grid grid-3" style={{ marginTop: 12, gap: 12 }}>
          <Field label="Forfatter">
            <input className="input" value={report.author} onChange={(e) => updReport((r) => void (r.author = e.target.value))} />
          </Field>
          <Field label="Klasse">
            <input className="input" value={report.className} onChange={(e) => updReport((r) => void (r.className = e.target.value))} />
          </Field>
          <Field label="Dato">
            <input className="input" type="date" value={report.date} onChange={(e) => updReport((r) => void (r.date = e.target.value))} />
          </Field>
        </div>
        <div className="row small muted" style={{ marginTop: 2 }}>
          <span className={`badge ${report.template === 'skole' ? 'badge-blue' : ''}`}>{report.template === 'skole' ? 'Skoleprosjekt elektrofag' : 'Standardmal'}</span>
          <span>Prosjekt: {project.name}</span>
          <span className="spacer" />
          <span>{Math.round(prog * 100)} % utfylt</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <Progress value={prog} />
        </div>
      </div>

      <SafetyNotice variant="drawing" />
      <Notice kind="warn">Rapporten er ikke en samsvarserklæring eller godkjenning av en elektrisk installasjon.</Notice>

      {report.template === 'skole' && (
        <Notice kind="info" title="Tips til elevrapporten">
          Skriv med egne ord. Hjelpeteksten under hver overskrift forteller hva seksjonen skal inneholde. Bruk «Fyll komponentliste fra skjema» for å hente komponentene fra
          koblingsskjemaet ditt.
        </Notice>
      )}

      {report.sections.map((s, i) => (
        <section key={s.id} className="card report-section">
          <div className="section-head">
            <span className="section-no">{i + 1}</span>
            <input className="input section-title" value={s.title} onChange={(e) => updSection(s.id)((x) => void (x.title = e.target.value))} aria-label="Seksjonstittel" />
            <span className="badge">{KIND_LABEL[s.kind]}</span>
            <button className="icon-btn" title="Flytt opp" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp size={16} />
            </button>
            <button className="icon-btn" title="Flytt ned" disabled={i === report.sections.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown size={16} />
            </button>
            <button className="icon-btn" title="Fjern seksjon" onClick={() => removeSection(s)}>
              <Trash2 size={16} />
            </button>
          </div>
          {s.help && <p className="section-help">{s.help}</p>}
          <SectionBody section={s} report={report} project={project} upd={updSection(s.id)} />
        </section>
      ))}

      <div className="card row add-section">
        <span style={{ fontWeight: 600 }}>Legg til seksjon:</span>
        <select className="select" style={{ width: 160 }} value={newKind} onChange={(e) => setNewKind(e.target.value as ReportSection['kind'])}>
          {NEW_SECTION_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => updReport((r) => void r.sections.push(blankSection(newKind)))}>
          <Plus size={16} /> Legg til
        </button>
      </div>
    </div>
  );
}
