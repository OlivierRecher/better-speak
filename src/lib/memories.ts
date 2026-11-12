/* « Garder ce souvenir » : seules les prises explicitement conservées sont stockées,
   localement (IndexedDB), jamais envoyées ailleurs. Tout le reste s'autodétruit. */
import { createStore, get, set, del, keys } from 'idb-keyval';

export interface Memory {
  id: string;
  date: number;
  topic: string;
  media: 'audio' | 'video';
  secs: number;
  blob: Blob;
}

const db = createStore('clair-memories', 'takes');

export async function keepMemory(m: Omit<Memory, 'id' | 'date'>): Promise<Memory> {
  const full: Memory = { ...m, id: `m${Date.now().toString(36)}`, date: Date.now() };
  await set(full.id, full, db);
  return full;
}

export async function listMemories(): Promise<Memory[]> {
  const ks = await keys(db);
  const all = await Promise.all(ks.map(k => get<Memory>(k, db)));
  return all.filter((m): m is Memory => !!m).sort((a, b) => b.date - a.date);
}

export const deleteMemory = (id: string) => del(id, db);
