import { useRef, useState } from 'react';
import { Download, FileIcon, Trash2, Upload } from 'lucide-react';
import type { AttachmentMeta, Project } from '../../types';
import { useProjects } from '../../store/projects';
import { Empty, Modal, confirmAction, toast } from '../../components/ui';
import { formatDateTime } from '../../utils/id';
import { downloadAttachment, formatBytes, isImage, useAttachmentUrl } from '../docs/attachments';
import { Thumb } from '../docs/SectionEditors';

const MAX_SIZE = 25 * 1024 * 1024;

export function AttachmentsTab({ project }: { project: Project }) {
  const addAttachment = useProjects((s) => s.addAttachment);
  const removeAttachment = useProjects((s) => s.removeAttachment);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<AttachmentMeta | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | File[] | null) => {
    if (!files) return;
    setBusy(true);
    let n = 0;
    try {
      for (const f of Array.from(files)) {
        if (f.size > MAX_SIZE) {
          toast(`«${f.name}» er for stor (maks ${formatBytes(MAX_SIZE)})`, true);
          continue;
        }
        if (await addAttachment(f)) n++;
      }
    } finally {
      setBusy(false);
    }
    if (n) toast(`${n} fil(er) lagt til`);
  };

  const remove = async (a: AttachmentMeta) => {
    if (!confirmAction(`Slette vedlegget «${a.name}»? Det fjernes også fra rapporter som bruker det.`)) return;
    await removeAttachment(a.id);
    toast('Vedlegget er slettet');
  };

  const files = [...project.attachments].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      >
        <Upload size={26} />
        <div style={{ fontWeight: 600 }}>{busy ? 'Laster opp …' : 'Slipp bilder eller filer her, eller klikk for å velge'}</div>
        <div className="small muted">Bilder fra arbeidet, datablad, PDF-er o.l. Lagres lokalt i nettleseren sammen med prosjektet.</div>
      </div>
      <input ref={input} type="file" multiple hidden onChange={(e) => (void upload(e.target.files), (e.target.value = ''))} />

      {files.length === 0 ? (
        <Empty>Ingen vedlegg ennå.</Empty>
      ) : (
        <div className="attach-grid">
          {files.map((a) => (
            <div key={a.id} className="card attach-card">
              <button className="attach-thumb" onClick={() => (isImage(a.type) ? setPreview(a) : void downloadAttachment(a.id))} title={isImage(a.type) ? 'Vis bilde' : 'Last ned'}>
                {isImage(a.type) ? <Thumb id={a.id} alt={a.name} /> : <FileIcon size={36} />}
              </button>
              <div className="attach-name" title={a.name}>
                {a.name}
              </div>
              <div className="small muted">
                {formatBytes(a.size)} · {formatDateTime(a.createdAt)}
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn btn-sm" onClick={() => void downloadAttachment(a.id)}>
                  <Download size={14} /> Last ned
                </button>
                <span className="spacer" />
                <button className="icon-btn" title="Slett" onClick={() => void remove(a)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && <ImagePreview meta={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function ImagePreview({ meta, onClose }: { meta: AttachmentMeta; onClose: () => void }) {
  const url = useAttachmentUrl(meta.id);
  return (
    <Modal
      title={meta.name}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={() => void downloadAttachment(meta.id)}>
          <Download size={16} /> Last ned
        </button>
      }
    >
      {url ? <img src={url} alt={meta.name} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} /> : <div className="muted">Laster …</div>}
    </Modal>
  );
}
