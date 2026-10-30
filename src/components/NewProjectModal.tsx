import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../store/projects';
import { Field, Modal, toast } from './ui';
import { SCHEMATIC_MODES } from '../store/factories';
import type { SchematicMode } from '../types';

type Start = 'tom' | 'schematic' | 'floorplan' | 'drawing';

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState<Start>('schematic');
  const [mode, setMode] = useState<SchematicMode>('prinsipp');
  const { create, addDoc } = useProjects();
  const navigate = useNavigate();

  const submit = async () => {
    const p = await create(name || 'Nytt prosjekt', description);
    toast(`Prosjektet «${p.name}» er opprettet`);
    onClose();
    if (start === 'tom') return navigate(`/prosjekt/${p.id}`);
    const doc =
      start === 'schematic'
        ? addDoc('schematic', 'Koblingsskjema 1', mode)
        : start === 'floorplan'
          ? addDoc('floorplan', 'Plantegning 1')
          : addDoc('drawing', 'Tegning 1');
    if (doc) navigate(`/prosjekt/${p.id}/tegning/${doc.id}`);
  };

  return (
    <Modal
      title="Nytt prosjekt"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Opprett prosjekt
          </button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), void submit())}>
        <Field label="Prosjektnavn">
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="F.eks. Lysanlegg bod" />
        </Field>
        <Field label="Beskrivelse (valgfri)">
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Field label="Start med">
          <select className="select" value={start} onChange={(e) => setStart(e.target.value as Start)}>
            <option value="schematic">Koblingsskjema</option>
            <option value="floorplan">Plantegning (installasjonsplan)</option>
            <option value="drawing">Fri tegning</option>
            <option value="tom">Tomt prosjekt</option>
          </select>
        </Field>
        {start === 'schematic' && (
          <Field label="Skjematype">
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value as SchematicMode)}>
              {SCHEMATIC_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
