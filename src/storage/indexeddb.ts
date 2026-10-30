import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project, ProjectSummary } from '../types';
import type { FileRepository, ProjectRepository, StoredFile } from './repository';

interface ElektroDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: number } };
  files: { key: string; value: StoredFile; indexes: { projectId: string } };
}

let dbPromise: Promise<IDBPDatabase<ElektroDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<ElektroDB>('elektrostudio', 1, {
      upgrade(database) {
        const projects = database.createObjectStore('projects', { keyPath: 'id' });
        projects.createIndex('updatedAt', 'updatedAt');
        const files = database.createObjectStore('files', { keyPath: 'id' });
        files.createIndex('projectId', 'projectId');
      },
    });
  }
  return dbPromise;
}

export class IndexedDbProjectRepository implements ProjectRepository {
  async list(): Promise<ProjectSummary[]> {
    const all = await (await db()).getAll('projects');
    return all
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        docCount: p.docs.length,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async get(id: string) {
    return (await db()).get('projects', id);
  }
  async save(project: Project) {
    await (await db()).put('projects', project);
  }
  async delete(id: string) {
    await (await db()).delete('projects', id);
  }
}

export class IndexedDbFileRepository implements FileRepository {
  async put(file: StoredFile) {
    await (await db()).put('files', file);
  }
  async get(id: string) {
    return (await db()).get('files', id);
  }
  async delete(id: string) {
    await (await db()).delete('files', id);
  }
  async listForProject(projectId: string) {
    return (await db()).getAllFromIndex('files', 'projectId', projectId);
  }
  async deleteForProject(projectId: string) {
    const d = await db();
    const keys = await d.getAllKeysFromIndex('files', 'projectId', projectId);
    const tx = d.transaction('files', 'readwrite');
    await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
  }
}
