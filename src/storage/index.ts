import { IndexedDbFileRepository, IndexedDbProjectRepository } from './indexeddb';
import type { FileRepository, ProjectRepository } from './repository';

export const projectRepo: ProjectRepository = new IndexedDbProjectRepository();
export const fileRepo: FileRepository = new IndexedDbFileRepository();

export type { ProjectRepository, FileRepository, StoredFile } from './repository';
