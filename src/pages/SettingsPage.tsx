import { useEffect, useState } from 'react';
import { Database, Download, RotateCcw, Settings, Trash2, User } from 'lucide-react';
import { useSettings } from '../store/settings';
import { useProjects } from '../store/projects';
import { Field, Notice, PageHeader, toast } from '../components/ui';
import { downloadBlob } from '../utils/id';

export default function SettingsPage() {
  const s = useSettings();
  const { summaries, exportProject, remove } = useProjects();
  const [usage, setUsage] = useState<string>('');

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined) setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB brukt${e.quota ? ` av ca. ${(e.quota / 1024 / 1024 / 1024).toFixed(1)} GB tilgjengelig` : ''}`);
    });
  }, []);

  const exportAll = async () => {
    for (const p of summaries) {
      const blob = await exportProject(p.id);
      if (blob) downloadBlob(blob, `${p.name.replace(/[\\/:*?"<>|]+/g, '_')}.elektro.json`);
    }
    toast(`${summaries.length} prosjekt(er) eksportert`);
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Innstillinger" icon={<Settings size={26} color="var(--accent-2)" />} description="Innstillingene lagres i denne nettleseren." />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <User size={18} /> Bruker
        </div>
        <div className="grid grid-3">
          <Field label="Navn (vises i tittelfelt og rapporter)">
            <input className="input" value={s.userName} onChange={(e) => s.set({ userName: e.target.value })} />
          </Field>
          <Field label="Skole / bedrift">
            <input className="input" value={s.school} onChange={(e) => s.set({ school: e.target.value })} />
          </Field>
          <Field label="Klasse">
            <input className="input" value={s.className} onChange={(e) => s.set({ className: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Tegneområde</div>
        <div className="grid grid-2">
          <Field label="Rutenettstørrelse (tegneenheter)" hint="I plantegning tilsvarer 10 enheter 10 cm.">
            <select className="select" value={s.gridSize} onChange={(e) => s.set({ gridSize: Number(e.target.value) })}>
              {[5, 10, 20].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lerret">
            <select className="select" value={s.canvasTheme} onChange={(e) => s.set({ canvasTheme: e.target.value as 'dark' | 'light' })}>
              <option value="dark">Mørkt</option>
              <option value="light">Lyst (papir)</option>
            </select>
          </Field>
          <Field label="Standardfarge for nye ledninger">
            <select className="select" value={s.defaultWireColor} onChange={(e) => s.set({ defaultWireColor: e.target.value })}>
              <option value="">Standard (tegnefarge)</option>
              <option value="#3b82f6">Blå</option>
              <option value="#ef4444">Rød</option>
              <option value="#22c55e">Grønn</option>
            </select>
          </Field>
          <Field label="Oppløsning ved PNG-eksport">
            <select className="select" value={s.exportScale} onChange={(e) => s.set({ exportScale: Number(e.target.value) })}>
              <option value={1}>Normal (1×)</option>
              <option value={2}>Høy (2×)</option>
              <option value={3}>Svært høy (3×)</option>
            </select>
          </Field>
          <Field label="Autolagring etter endring">
            <select className="select" value={s.autosaveDelay} onChange={(e) => s.set({ autosaveDelay: Number(e.target.value) })}>
              <option value={300}>Straks (0,3 s)</option>
              <option value={800}>Normalt (0,8 s)</option>
              <option value={2000}>Rolig (2 s)</option>
            </select>
          </Field>
        </div>
        <label className="checkbox field">
          <input type="checkbox" checked={s.showGrid} onChange={(e) => s.set({ showGrid: e.target.checked })} /> Vis rutenett
        </label>
        <label className="checkbox field">
          <input type="checkbox" checked={s.snap} onChange={(e) => s.set({ snap: e.target.checked })} /> Fest til rutenett
        </label>
        <label className="checkbox field">
          <input type="checkbox" checked={s.orthoWires} onChange={(e) => s.set({ orthoWires: e.target.checked })} /> Rettvinklede ledninger og vegger
        </label>
        <label className="checkbox field">
          <input type="checkbox" checked={s.showHints} onChange={(e) => s.set({ showHints: e.target.checked })} /> Vis hjelpetekster i statuslinjen
        </label>
        <button
          className="btn btn-sm"
          onClick={() => {
            s.reset();
            toast('Innstillingene er tilbakestilt');
          }}
        >
          <RotateCcw size={14} /> Tilbakestill innstillinger
        </button>
      </div>

      <div className="card">
        <div className="card-title">
          <Database size={18} /> Data og lagring
        </div>
        <p className="small muted">
          Alle prosjekter, tegninger og vedlegg lagres lokalt i nettleseren (IndexedDB). Data sendes ikke til noen server. Hvis du sletter nettleserdata, forsvinner prosjektene – ta derfor
          jevnlig sikkerhetskopi. {usage && `Lagring: ${usage}.`}
        </p>
        <Notice kind="info">Lagringen er bygd med et eget lagringsgrensesnitt, slik at brukerkontoer og skylagring kan legges til senere uten å endre resten av programmet.</Notice>
        <div className="row">
          <button className="btn" onClick={exportAll} disabled={summaries.length === 0}>
            <Download size={16} /> Eksporter alle prosjekter ({summaries.length})
          </button>
          <button
            className="btn btn-danger"
            disabled={summaries.length === 0}
            onClick={async () => {
              if (!window.confirm('Slette ALLE prosjekter permanent? Eksporter først hvis du vil beholde dem.')) return;
              if (!window.confirm('Er du helt sikker? Dette kan ikke angres.')) return;
              for (const p of summaries) await remove(p.id);
              toast('Alle prosjekter er slettet');
            }}
          >
            <Trash2 size={16} /> Slett alle prosjekter
          </button>
        </div>
      </div>
    </div>
  );
}
