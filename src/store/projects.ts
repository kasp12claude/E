import { create } from 'zustand';
import { produce } from 'immer';
import type { AttachmentMeta, DocKind, DrawingDoc, Project, ProjectSummary, SchematicMode } from '../types';
import { fileRepo, projectRepo } from '../storage';
import { newDoc, newProject } from './factories';
import { useSettings } from './settings';
import { uid } from '../utils/id';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

interface ProjectState {
  summaries: ProjectSummary[];
  current: Project | null;
  activeId: string | null;
  status: SaveStatus;
  lastSaved: number | null;
  loaded: boolean;

  refresh(): Promise<void>;
  open(id: string): Promise<Project | undefined>;
  create(name: string, description?: string): Promise<Project>;
  /** Endrer prosjektet som er åpent (immer-oppskrift) og planlegger autolagring. */
  update(recipe: (draft: Project) => void): void;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<Project | undefined>;
  flush(): Promise<void>;
  addDoc(kind: DocKind, name: string, mode?: SchematicMode): DrawingDoc | null;
  replaceDoc(doc: DrawingDoc): void;
  removeDoc(docId: string): void;
  addAttachment(file: File | Blob, name?: string): Promise<AttachmentMeta | null>;
  removeAttachment(id: string): Promise<void>;
  exportProject(id: string): Promise<Blob | null>;
  importProject(text: string): Promise<Project>;
}

const ACTIVE_KEY = 'elektrostudio-active-project';
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignorer */
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

export const useProjects = create<ProjectState>()((set, get) => ({
  summaries: [],
  current: null,
  activeId: readActive(),
  status: 'saved',
  lastSaved: null,
  loaded: false,

  async refresh() {
    const summaries = await projectRepo.list();
    set({ summaries, loaded: true });
  },

  async open(id) {
    const cur = get().current;
    if (cur?.id === id) return cur;
    await get().flush();
    const p = await projectRepo.get(id);
    if (p) {
      set({ current: p, activeId: id, status: 'saved' });
      writeActive(id);
    }
    return p;
  },

  async create(name, description = '') {
    await get().flush();
    const p = newProject(name, description);
    await projectRepo.save(p);
    set({ current: p, activeId: p.id, status: 'saved', lastSaved: Date.now() });
    writeActive(p.id);
    await get().refresh();
    return p;
  },

  update(recipe) {
    const cur = get().current;
    if (!cur) return;
    const next = produce(cur, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
    set({ current: next, status: 'dirty' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void get().flush(), useSettings.getState().autosaveDelay);
  },

  async flush() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const { current, status } = get();
    if (!current || status === 'saved') return;
    set({ status: 'saving' });
    try {
      await projectRepo.save(current);
      // Bare marker som lagret hvis ingen nye endringer kom under lagringen
      if (get().current === current) set({ status: 'saved', lastSaved: Date.now() });
      else set({ status: 'dirty' });
      const summaries = await projectRepo.list();
      set({ summaries });
    } catch (e) {
      console.error('Lagring feilet', e);
      set({ status: 'error' });
    }
  },

  async remove(id) {
    await projectRepo.delete(id);
    await fileRepo.deleteForProject(id);
    if (get().current?.id === id) set({ current: null });
    if (get().activeId === id) {
      set({ activeId: null });
      writeActive(null);
    }
    await get().refresh();
  },

  async duplicate(id) {
    await get().flush();
    const p = await projectRepo.get(id);
    if (!p) return undefined;
    const copy: Project = { ...structuredClone(p), id: uid('prj'), name: `${p.name} (kopi)`, createdAt: Date.now(), updatedAt: Date.now() };
    // Kopier vedlegg med nye id-er
    const files = await fileRepo.listForProject(id);
    const idMap = new Map<string, string>();
    for (const f of files) {
      const nid = uid('file');
      idMap.set(f.id, nid);
      await fileRepo.put({ ...f, id: nid, projectId: copy.id });
    }
    copy.attachments = copy.attachments.map((a) => ({ ...a, id: idMap.get(a.id) ?? a.id }));
    copy.reports.forEach((r) =>
      r.sections.forEach((s) => {
        if (s.imageIds) s.imageIds = s.imageIds.map((i) => idMap.get(i) ?? i);
      }),
    );
    await projectRepo.save(copy);
    await get().refresh();
    return copy;
  },

  addDoc(kind, name, mode) {
    if (!get().current) return null;
    const doc = newDoc(kind, name, mode);
    get().update((p) => {
      p.docs.push(doc);
    });
    return doc;
  },

  replaceDoc(doc) {
    get().update((p) => {
      const i = p.docs.findIndex((d) => d.id === doc.id);
      if (i >= 0) p.docs[i] = { ...doc, updatedAt: Date.now() };
    });
  },

  removeDoc(docId) {
    get().update((p) => {
      p.docs = p.docs.filter((d) => d.id !== docId);
      p.reports.forEach((r) =>
        r.sections.forEach((s) => {
          if (s.drawingIds) s.drawingIds = s.drawingIds.filter((d) => d !== docId);
        }),
      );
    });
  },

  async addAttachment(file, name) {
    const cur = get().current;
    if (!cur) return null;
    const meta: AttachmentMeta = {
      id: uid('file'),
      name: name ?? (file instanceof File ? file.name : 'vedlegg'),
      type: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: Date.now(),
    };
    await fileRepo.put({ ...meta, projectId: cur.id, blob: file });
    get().update((p) => {
      p.attachments.push(meta);
    });
    return meta;
  },

  async removeAttachment(id) {
    await fileRepo.delete(id);
    get().update((p) => {
      p.attachments = p.attachments.filter((a) => a.id !== id);
      p.reports.forEach((r) =>
        r.sections.forEach((s) => {
          if (s.imageIds) s.imageIds = s.imageIds.filter((i) => i !== id);
        }),
      );
    });
  },

  async exportProject(id) {
    await get().flush();
    const p = await projectRepo.get(id);
    if (!p) return null;
    const files = await fileRepo.listForProject(id);
    const encoded = await Promise.all(
      files.map(async (f) => ({ id: f.id, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt, data: await blobToDataUrl(f.blob) })),
    );
    const payload = { format: 'elektrostudio-project', version: 1, exportedAt: new Date().toISOString(), project: p, files: encoded };
    return new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
  },

  async importProject(text) {
    const data = JSON.parse(text);
    if (data?.format !== 'elektrostudio-project' || !data.project) {
      throw new Error('Filen er ikke et ElektroStudio-prosjekt.');
    }
    const p: Project = data.project;
    const oldId = p.id;
    p.id = uid('prj');
    p.name = p.name || 'Importert prosjekt';
    p.updatedAt = Date.now();
    const idMap = new Map<string, string>();
    for (const f of data.files ?? []) {
      const nid = uid('file');
      idMap.set(f.id, nid);
      await fileRepo.put({ id: nid, projectId: p.id, name: f.name, type: f.type, size: f.size, createdAt: f.createdAt, blob: await dataUrlToBlob(f.data) });
    }
    p.attachments = (p.attachments ?? []).map((a) => ({ ...a, id: idMap.get(a.id) ?? a.id }));
    p.reports?.forEach((r) => r.sections.forEach((s) => s.imageIds && (s.imageIds = s.imageIds.map((i) => idMap.get(i) ?? i))));
    void oldId;
    await projectRepo.save(p);
    await get().refresh();
    return p;
  },
}));

// Lagre før siden lukkes eller skjules
if (typeof window !== 'undefined') {
  const flush = () => void useProjects.getState().flush();
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Henter dokument fra prosjektet som er åpent. */
export function useDoc(docId: string | undefined) {
  return useProjects((s) => s.current?.docs.find((d) => d.id === docId));
}
