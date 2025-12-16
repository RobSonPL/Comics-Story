
import { GeneratedPanel, ComicStyle } from '../types';

const DB_NAME = 'ComicCreatorDB';
const STORE_NAME = 'comics';
const DB_VERSION = 1;

export interface SavedComic {
  id: string;
  title: string;
  author: string;
  createdAt: number;
  panels: GeneratedPanel[];
  style: ComicStyle;
  logo: string | null;
  styleReference?: string | null;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

export const saveComicToDB = async (comic: SavedComic): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(comic);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSavedComics = async (): Promise<SavedComic[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    // Get all, sorted by date (using cursor to reverse is typical, but let's just get all and sort in JS)
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as SavedComic[];
      // Sort desc
      resolve(results.sort((a, b) => b.createdAt - a.createdAt));
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteComicFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};