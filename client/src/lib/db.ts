/**
 * IndexedDB offline cache for advisory responses, using the `idb` library.
 * architecture.md: "caching the last successful response locally (IndexedDB)
 * so the app still shows something if offline."
 */

import { openDB, type IDBPDatabase } from "idb";
import type { AdvisoryData } from "./api";

const DB_NAME = "cropx-offline";
const DB_VERSION = 1;
const ADVISORY_STORE = "advisories";

interface CropXDB {
  advisories: {
    key: string; // farmerId
    value: {
      farmerId: string;
      data: AdvisoryData;
      cachedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CropXDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CropXDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(ADVISORY_STORE)) {
          db.createObjectStore(ADVISORY_STORE, { keyPath: "farmerId" });
        }
      },
    });
  }
  return dbPromise;
}

/** Cache the latest advisory for a farmer */
export async function cacheAdvisory(farmerId: string, data: AdvisoryData): Promise<void> {
  try {
    const db = await getDB();
    await db.put(ADVISORY_STORE, {
      farmerId,
      data,
      cachedAt: Date.now(),
    });
  } catch (e) {
    console.warn("Failed to cache advisory to IndexedDB:", e);
  }
}

/** Retrieve the last cached advisory for a farmer (used when offline) */
export async function getCachedAdvisory(
  farmerId: string
): Promise<{ data: AdvisoryData; cachedAt: number } | null> {
  try {
    const db = await getDB();
    const entry = await db.get(ADVISORY_STORE, farmerId);
    if (entry) {
      return { data: entry.data, cachedAt: entry.cachedAt };
    }
    return null;
  } catch (e) {
    console.warn("Failed to read cached advisory from IndexedDB:", e);
    return null;
  }
}
