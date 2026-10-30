import type { Project, ProjectSummary } from '../types';

/**
 * Lagringsgrensesnitt. Dagens implementasjon bruker IndexedDB i nettleseren.
 * En senere sky-implementasjon (med brukerkonto) kan implementere det samme grensesnittet
 * uten at resten av appen må endres.
 */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | undefined>;
  save(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface StoredFile {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  blob: Blob;
}

export interface FileRepository {
  put(file: StoredFile): Promise<void>;
  get(id: string): Promise<StoredFile | undefined>;
  delete(id: string): Promise<void>;
  listForProject(projectId: string): Promise<StoredFile[]>;
  deleteForProject(projectId: string): Promise<void>;
}
