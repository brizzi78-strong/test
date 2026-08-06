/**
 * Storage abstraction: one student profile per owner plus tracked
 * applications. In-memory implementation; swap in a durable store behind the
 * same interface if this ever outgrows a demo.
 */

import type { Application, StudentProfile } from '../domain/types.ts';

export interface Store {
  getProfile(ownerId: string): StudentProfile | undefined;
  putProfile(profile: StudentProfile): void;
  getApplication(id: string): Application | undefined;
  putApplication(app: Application): void;
  listApplications(ownerId: string): Application[];
  deleteApplication(id: string): void;
}

export function createInMemoryStore(): Store {
  const profiles = new Map<string, StudentProfile>();
  const applications = new Map<string, Application>();
  return {
    getProfile: (ownerId) => {
      const found = profiles.get(ownerId);
      return found ? structuredClone(found) : undefined;
    },
    putProfile: (profile) => {
      profiles.set(profile.ownerId, structuredClone(profile));
    },
    getApplication: (id) => {
      const found = applications.get(id);
      return found ? structuredClone(found) : undefined;
    },
    putApplication: (app) => {
      applications.set(app.id, structuredClone(app));
    },
    listApplications: (ownerId) =>
      [...applications.values()]
        .filter((a) => a.ownerId === ownerId)
        .map((a) => structuredClone(a)),
    deleteApplication: (id) => {
      applications.delete(id);
    },
  };
}
