import { useRef, useState } from 'react';
import { Check, ImagePlus, Plus, Trash2, Wand2, X } from 'lucide-react';
import type { DrawingDoc, Project, Report, ReportSection } from '../../types';
import { useProjects } from '../../store/projects';
import { DOC_KIND_LABEL } from '../../store/factories';
import { StaticDrawing } from '../../editor/StaticDrawing';
import { confirmAction, toast } from '../../components/ui';
import { uid } from '../../utils/id';
import { isImage, useAttachmentUrl } from './attachments';
import { COMPONENT_COLUMNS, componentRows, isComponentListSection } from './reportUtils';

export type SectionUpdater = (fn: (s: ReportSection) => void) => void;

interface Props {
  section: ReportSection;
  report: Report;
  project: Project;
  upd: SectionUpdater;
}

export function SectionBody(props: Props) {
  const { section: s, upd } = props;
  const comment = (
    <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
      <label>Kommentar (valgfri)</label>
      <textarea className="textarea" rows={2} value={s.text} onChange={(e) => upd((x) => void (x.text = e.target.value))} placeholder="Skriv en forklaring til innholdet over …" />
    </div>
  );
  switch (s.kind) {
    case 'text':
    case 'list':
      return (
        <textarea
          className="textarea report-text"
          rows={6}
          value={s.text}
          placeholder={s.help ?? 'Skriv her …'}
          onChange={(e) => upd((x) => void (x.text = e.target.value))}
        />
      );
    case 'table':
      return (
        <>
          <TableEditor {...props} />
          {comment}
        </>
      );
    case 'checklist':
      return (
        <>
          <ChecklistEditor {...props} />
          {comment}
        </>
      );
    case 'drawing':
      return (
        <>
          <DrawingPicker {...props} />
          {comment}
        </>
      );
    case 'images':
      return (
        <>
          <ImagePicker {...props} />
          {comment}
        </>
      );
  }
}

// ---------------------------------------------------------------------------
function TableEditor({ section: s, report, project, upd }: Props) {
  const cols = s.columns ?? [];
  const rows = s.rows ?? [];
  const [picking, setPicking] = useState(false);
  return (
    <div>
      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              {cols.map((c, ci) => (
                <th key={ci}>{c}</th>
              ))}
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {cols.map((_, ci) => (
                  <td key={ci}>
                    <input
                      className="input"
                      value={r[ci] ?? ''}
                      onChange={(e) =>
                        upd((x) => {
                          const row = x.rows![ri];
                          while (row.length < cols.length) row.push('');
                          row[ci] = e.target.value;
                        })
                      }
                    />
                  </td>
                ))}
                <td>
                  <button className="icon-btn" title="Fjern rad" onClick={() => upd((x) => void x.rows!.splice(ri, 1))}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-sm" onClick={() => upd((x) => void (x.rows ??= []).push(cols.map(() => '')))}>
          <Plus size={14} /> Legg til rad
        </button>
        {isComponentListSection(s) && (
          <button className="btn btn-sm" onClick={() => setPicking((v) => !v)}>
            <Wand2 size={14} /> Fyll komponentliste fra skjema
          </button>
        )}
      </div>
      {picking && <ComponentFill section={s} report={report} project={project} upd={upd} onDone={() => setPicking(false)} />}
    </div>
  );
}

function ComponentFill({ section, report, project, upd, onDone }: Props & { onDone: () => void }) {
  const candidates = project.docs.filter((d) => d.kind !== 'floorplan');
  // Forhåndsvalg: skjema som er valgt i rapportens tegningsseksjoner, ellers alle koblingsskjema
  const fromReport = new Set(report.sections.flatMap((s) => (s.kind === 'drawing' ? s.drawingIds ?? [] : [])));
  const initial = candidates.filter((d) => fromReport.has(d.id)).map((d) => d.id);
  const [chosen, setChosen] = useState<string[]>(initial.length ? initial : candidates.filter((d) => d.kind === 'schematic').map((d) => d.id));

  if (candidates.length === 0) {
    return (
      <div className="fill-box">
        <span className="muted small">Prosjektet har ingen koblingsskjema eller tegninger ennå.</span>
        <button className="btn btn-sm" onClick={onDone}>
          Lukk
        </button>
      </div>
    );
  }
  const apply = () => {
    const docs = candidates.filter((d) => chosen.includes(d.id));
    const rows = componentRows(docs);
    if (rows.length === 0) {
      toast('Fant ingen komponenter i de valgte tegningene', true);
      return;
    }
    const hasData = (section.rows ?? []).some((r) => r.some((c) => c.trim()));
    if (hasData && !confirmAction('Komponentlisten har innhold fra før. Erstatte den med komponentene fra skjemaet?')) return;
    upd((x) => {
      x.columns = [...COMPONENT_COLUMNS];
      x.rows = rows;
    });
    toast(`${rows.length} rader lagt inn i komponentlisten`);
    onDone();
  };
  return (
    <div className="fill-box">
      <div className="small muted" style={{ marginBottom: 6 }}>
        Velg skjema/tegninger som komponentene skal telles fra:
      </div>
      <div className="col" style={{ gap: 4 }}>
        {candidates.map((d) => (
          <label key={d.id} className="checkbox">
            <input type="checkbox" checked={chosen.includes(d.id)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, d.id] : c.filter((i) => i !== d.id)))} />
            {d.name} <span className="badge">{DOC_KIND_LABEL[d.kind]}</span>
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-sm btn-primary" disabled={chosen.length === 0} onClick={apply}>
          <Check size={14} /> Fyll inn
        </button>
        <button className="btn btn-sm" onClick={onDone}>
          Avbryt
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ChecklistEditor({ section: s, upd }: Props) {
  const [text, setText] = useState('');
  const items = s.items ?? [];
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 6 }}>
        {done} av {items.length} punkter krysset av
      </div>
      <div className="col" style={{ gap: 4 }}>
        {items.map((it, i) => (
          <div key={it.id} className="row check-row">
            <input type="checkbox" checked={it.done} onChange={(e) => upd((x) => void (x.items![i].done = e.target.checked))} aria-label="Utført" />
            <input className="input check-input" value={it.text} onChange={(e) => upd((x) => void (x.items![i].text = e.target.value))} />
            <button className="icon-btn" title="Fjern punkt" onClick={() => upd((x) => void x.items!.splice(i, 1))}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <form
        className="row"
        style={{ marginTop: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          upd((x) => void (x.items ??= []).push({ id: uid('ci'), text: text.trim(), done: false }));
          setText('');
        }}
      >
        <input className="input" style={{ flex: 1, minWidth: 180 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nytt punkt …" />
        <button className="btn btn-sm" type="submit" disabled={!text.trim()}>
          <Plus size={14} /> Legg til
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
function DrawingPicker({ section: s, project, report, upd }: Props) {
  const ids = s.drawingIds ?? [];
  const wantFloor = s.title.toLowerCase().includes('plan');
  const docs = [...project.docs].sort((a, b) => Number((b.kind === 'floorplan') === wantFloor) - Number((a.kind === 'floorplan') === wantFloor));
  if (docs.length === 0) {
    return <div className="muted small">Prosjektet har ingen tegninger ennå. Lag et koblingsskjema eller en plantegning først.</div>;
  }
  const selected = ids.map((id) => project.docs.find((d) => d.id === id)).filter((d): d is DrawingDoc => !!d);
  return (
    <div>
      <div className="doc-choices">
        {docs.map((d) => {
          const on = ids.includes(d.id);
          return (
            <label key={d.id} className={`doc-choice ${on ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  upd((x) => {
                    x.drawingIds = e.target.checked ? [...(x.drawingIds ?? []), d.id] : (x.drawingIds ?? []).filter((i) => i !== d.id);
                  })
                }
              />
              <span>{d.name}</span>
              <span className="badge">{DOC_KIND_LABEL[d.kind]}</span>
            </label>
          );
        })}
      </div>
      {selected.map((d) => (
        <figure key={d.id} className="drawing-preview">
          <StaticDrawing
            doc={d}
            projectName={project.name}
            author={report.author}
            ink="#d6e4ff"
            paper="transparent"
            withBackground={false}
            style={{ width: '100%', height: 'auto', maxHeight: 360 }}
          />
          <figcaption>Figur: {d.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ImagePicker({ section: s, project, upd }: Props) {
  const addAttachment = useProjects((st) => st.addAttachment);
  const input = useRef<HTMLInputElement>(null);
  const ids = s.imageIds ?? [];
  const images = project.attachments.filter((a) => isImage(a.type));

  const upload = async (files: FileList | null) => {
    if (!files) return;
    const added: string[] = [];
    for (const f of Array.from(files)) {
      if (!isImage(f.type)) {
        toast(`«${f.name}» er ikke et bilde`, true);
        continue;
      }
      const meta = await addAttachment(f);
      if (meta) added.push(meta.id);
    }
    if (added.length) {
      upd((x) => void (x.imageIds = [...(x.imageIds ?? []), ...added]));
      toast(`${added.length} bilde(r) lastet opp og lagt til`);
    }
  };

  return (
    <div>
      <div className="image-grid">
        {images.map((a) => {
          const on = ids.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={`image-choice ${on ? 'on' : ''}`}
              title={on ? 'Fjern fra rapporten' : 'Legg til i rapporten'}
              onClick={() => upd((x) => void (x.imageIds = on ? (x.imageIds ?? []).filter((i) => i !== a.id) : [...(x.imageIds ?? []), a.id]))}
            >
              <Thumb id={a.id} alt={a.name} />
              <span className="image-name">{a.name}</span>
              {on && (
                <span className="image-check">
                  <Check size={14} />
                </span>
              )}
            </button>
          );
        })}
        <button type="button" className="image-choice upload" onClick={() => input.current?.click()}>
          <ImagePlus size={24} />
          <span className="image-name">Last opp bilde</span>
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (void upload(e.target.files), (e.target.value = ''))} />
      <div className="small muted" style={{ marginTop: 6 }}>
        {ids.length} bilde(r) valgt. Klikk på et bilde for å velge eller fjerne det. Bildene lagres som vedlegg i prosjektet.
      </div>
    </div>
  );
}

export function Thumb({ id, alt }: { id: string; alt: string }) {
  const url = useAttachmentUrl(id);
  return url ? <img src={url} alt={alt} /> : <span className="thumb-placeholder" />;
}
