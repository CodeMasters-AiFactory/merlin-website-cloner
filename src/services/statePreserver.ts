/**
 * State Preservation Service
 * Captures and restores complete application state for full app cloning
 *
 * Features:
 * - Redux/MobX/Zustand state capture
 * - LocalStorage/SessionStorage preservation
 * - IndexedDB database cloning
 * - Cookie preservation
 * - Service Worker state
 * - In-memory state detection
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: Cookie[];
}

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface IndexedDBData {
  databases: DatabaseInfo[];
}

export interface DatabaseInfo {
  name: string;
  version: number;
  objectStores: ObjectStoreInfo[];
}

export interface ObjectStoreInfo {
  name: string;
  keyPath: string | null;
  autoIncrement: boolean;
  indexes: IndexInfo[];
  data: Record<string, unknown>[];
}

export interface IndexInfo {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface StateSnapshot {
  id: string;
  timestamp: string;
  url: string;
  storage: StorageData;
  indexedDB: IndexedDBData;
  reduxState?: Record<string, unknown>;
  mobxState?: Record<string, unknown>;
  zustandState?: Record<string, unknown>;
  customState?: Record<string, unknown>;
  serviceWorker?: ServiceWorkerInfo;
  memoryState?: Record<string, unknown>;
  hash: string;
}

export interface ServiceWorkerInfo {
  scriptURL?: string;
  scope?: string;
  cacheNames: string[];
  cachedResponses: CachedResponse[];
}

export interface CachedResponse {
  url: string;
  headers: Record<string, string>;
  status: number;
  body?: string;
}

export class StatePreserver extends EventEmitter {
  private dataDir: string;
  private snapshots: Map<string, StateSnapshot> = new Map();

  constructor(dataDir: string = './data/state') {
    super();
    this.dataDir = dataDir;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    console.log('[StatePreserver] Service initialized');
  }

  /**
   * Capture all state from a page
   * This script should be executed in the browser context
   */
  getCaptureScript(): string {
    return `
(async function captureState() {
  const state = {
    storage: {},
    indexedDB: { databases: [] },
    customState: {},
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };

  // Capture localStorage
  try {
    state.storage.localStorage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        state.storage.localStorage[key] = localStorage.getItem(key);
      }
    }
  } catch (e) {
    console.warn('[StatePreserver] localStorage capture failed:', e);
  }

  // Capture sessionStorage
  try {
    state.storage.sessionStorage = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        state.storage.sessionStorage[key] = sessionStorage.getItem(key);
      }
    }
  } catch (e) {
    console.warn('[StatePreserver] sessionStorage capture failed:', e);
  }

  // Capture cookies
  try {
    state.storage.cookies = document.cookie.split(';').map(c => {
      const [name, ...valueParts] = c.trim().split('=');
      return { name: name.trim(), value: valueParts.join('=') };
    }).filter(c => c.name);
  } catch (e) {
    console.warn('[StatePreserver] cookie capture failed:', e);
  }

  // Capture Redux state
  try {
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
      const stores = window.__REDUX_DEVTOOLS_EXTENSION__.stores || {};
      const storeKeys = Object.keys(stores);
      if (storeKeys.length > 0) {
        state.reduxState = stores[storeKeys[0]]?.getState?.() || {};
      }
    } else if (window.store?.getState) {
      state.reduxState = window.store.getState();
    } else if (window.__NEXT_REDUX_STORE__?.getState) {
      state.reduxState = window.__NEXT_REDUX_STORE__.getState();
    }
  } catch (e) {
    console.warn('[StatePreserver] Redux capture failed:', e);
  }

  // Capture Zustand state
  try {
    if (window.__ZUSTAND_DEVTOOLS_HOOKS__) {
      state.zustandState = {};
      for (const [name, hook] of Object.entries(window.__ZUSTAND_DEVTOOLS_HOOKS__)) {
        if (hook?.getState) {
          state.zustandState[name] = hook.getState();
        }
      }
    }
  } catch (e) {
    console.warn('[StatePreserver] Zustand capture failed:', e);
  }

  // Capture MobX state
  try {
    if (window.__MOBX_DEVTOOLS_GLOBAL_HOOK__) {
      const stores = window.__MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobXReact?.stores || [];
      state.mobxState = {};
      stores.forEach((store, i) => {
        try {
          state.mobxState['store_' + i] = JSON.parse(JSON.stringify(store));
        } catch (e) {}
      });
    }
  } catch (e) {
    console.warn('[StatePreserver] MobX capture failed:', e);
  }

  // Capture IndexedDB
  try {
    if (window.indexedDB && indexedDB.databases) {
      const dbList = await indexedDB.databases();
      for (const dbInfo of dbList) {
        if (!dbInfo.name) continue;

        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(dbInfo.name, dbInfo.version);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const dbData = {
          name: dbInfo.name,
          version: dbInfo.version,
          objectStores: [],
        };

        for (const storeName of db.objectStoreNames) {
          try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);

            const storeData = {
              name: storeName,
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement,
              indexes: [],
              data: [],
            };

            // Get indexes
            for (const indexName of store.indexNames) {
              const index = store.index(indexName);
              storeData.indexes.push({
                name: indexName,
                keyPath: index.keyPath,
                unique: index.unique,
                multiEntry: index.multiEntry,
              });
            }

            // Get all data
            const allData = await new Promise((resolve, reject) => {
              const request = store.getAll();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });

            storeData.data = allData.slice(0, 1000); // Limit to prevent huge payloads
            dbData.objectStores.push(storeData);
          } catch (e) {
            console.warn('[StatePreserver] Error reading store:', storeName, e);
          }
        }

        db.close();
        state.indexedDB.databases.push(dbData);
      }
    }
  } catch (e) {
    console.warn('[StatePreserver] IndexedDB capture failed:', e);
  }

  // Capture Service Worker caches
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      state.serviceWorker = {
        cacheNames,
        cachedResponses: [],
      };

      // Sample first 50 cached items
      for (const cacheName of cacheNames.slice(0, 5)) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests.slice(0, 10)) {
          try {
            const response = await cache.match(request);
            if (response) {
              state.serviceWorker.cachedResponses.push({
                url: request.url,
                headers: Object.fromEntries(response.headers),
                status: response.status,
              });
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.warn('[StatePreserver] ServiceWorker cache capture failed:', e);
  }

  // Capture window custom state
  try {
    const knownKeys = [
      '__INITIAL_STATE__',
      '__NUXT__',
      '__NEXT_DATA__',
      'APP_STATE',
      'INITIAL_PROPS',
      '__PRELOADED_STATE__',
      '__APP_CONFIG__',
    ];

    for (const key of knownKeys) {
      if (window[key]) {
        try {
          state.customState[key] = JSON.parse(JSON.stringify(window[key]));
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[StatePreserver] Custom state capture failed:', e);
  }

  return state;
})();
`;
  }

  /**
   * Get the script to restore state
   */
  getRestoreScript(snapshot: StateSnapshot): string {
    const safeJSON = (obj: unknown) =>
      JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    return `
(function restoreState() {
  const state = ${safeJSON(snapshot)};

  // Restore localStorage
  try {
    if (state.storage?.localStorage) {
      localStorage.clear();
      for (const [key, value] of Object.entries(state.storage.localStorage)) {
        localStorage.setItem(key, value);
      }
      console.log('[StatePreserver] localStorage restored');
    }
  } catch (e) {
    console.warn('[StatePreserver] localStorage restore failed:', e);
  }

  // Restore sessionStorage
  try {
    if (state.storage?.sessionStorage) {
      sessionStorage.clear();
      for (const [key, value] of Object.entries(state.storage.sessionStorage)) {
        sessionStorage.setItem(key, value);
      }
      console.log('[StatePreserver] sessionStorage restored');
    }
  } catch (e) {
    console.warn('[StatePreserver] sessionStorage restore failed:', e);
  }

  // Restore cookies
  try {
    if (state.storage?.cookies) {
      for (const cookie of state.storage.cookies) {
        let cookieStr = cookie.name + '=' + cookie.value;
        if (cookie.path) cookieStr += '; path=' + cookie.path;
        if (cookie.domain) cookieStr += '; domain=' + cookie.domain;
        if (cookie.expires) cookieStr += '; expires=' + new Date(cookie.expires).toUTCString();
        if (cookie.secure) cookieStr += '; secure';
        if (cookie.sameSite) cookieStr += '; samesite=' + cookie.sameSite;
        document.cookie = cookieStr;
      }
      console.log('[StatePreserver] cookies restored');
    }
  } catch (e) {
    console.warn('[StatePreserver] cookie restore failed:', e);
  }

  // Restore IndexedDB
  try {
    if (state.indexedDB?.databases) {
      for (const dbInfo of state.indexedDB.databases) {
        const request = indexedDB.open(dbInfo.name, dbInfo.version);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          for (const storeInfo of dbInfo.objectStores) {
            if (!db.objectStoreNames.contains(storeInfo.name)) {
              const store = db.createObjectStore(storeInfo.name, {
                keyPath: storeInfo.keyPath,
                autoIncrement: storeInfo.autoIncrement,
              });

              for (const indexInfo of storeInfo.indexes || []) {
                store.createIndex(indexInfo.name, indexInfo.keyPath, {
                  unique: indexInfo.unique,
                  multiEntry: indexInfo.multiEntry,
                });
              }
            }
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;

          for (const storeInfo of dbInfo.objectStores) {
            if (db.objectStoreNames.contains(storeInfo.name)) {
              try {
                const tx = db.transaction(storeInfo.name, 'readwrite');
                const store = tx.objectStore(storeInfo.name);

                store.clear();
                for (const item of storeInfo.data || []) {
                  store.put(item);
                }
              } catch (e) {
                console.warn('[StatePreserver] Store restore failed:', storeInfo.name, e);
              }
            }
          }

          db.close();
        };
      }
      console.log('[StatePreserver] IndexedDB restored');
    }
  } catch (e) {
    console.warn('[StatePreserver] IndexedDB restore failed:', e);
  }

  // Restore custom state
  try {
    if (state.customState) {
      for (const [key, value] of Object.entries(state.customState)) {
        window[key] = value;
      }
      console.log('[StatePreserver] Custom state restored');
    }
  } catch (e) {
    console.warn('[StatePreserver] Custom state restore failed:', e);
  }

  // Trigger state restored event
  try {
    window.dispatchEvent(new CustomEvent('merlin:state-restored', { detail: state }));
  } catch (e) {}

  console.log('[StatePreserver] State restoration complete');
})();
`;
  }

  /**
   * Process captured state from browser
   */
  async processCapture(rawState: unknown, sessionId: string): Promise<StateSnapshot> {
    const state = rawState as Partial<StateSnapshot>;

    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: state.timestamp || new Date().toISOString(),
      url: state.url || '',
      storage: {
        localStorage: state.storage?.localStorage || {},
        sessionStorage: state.storage?.sessionStorage || {},
        cookies: state.storage?.cookies || [],
      },
      indexedDB: state.indexedDB || { databases: [] },
      reduxState: state.reduxState,
      mobxState: state.mobxState,
      zustandState: state.zustandState,
      customState: state.customState,
      serviceWorker: state.serviceWorker,
      memoryState: state.memoryState,
      hash: '',
    };

    // Generate hash for deduplication
    snapshot.hash = this.hashSnapshot(snapshot);

    // Save snapshot
    await this.saveSnapshot(snapshot, sessionId);

    this.snapshots.set(snapshot.id, snapshot);
    this.emit('snapshotCaptured', { snapshotId: snapshot.id, sessionId });

    return snapshot;
  }

  /**
   * Get a snapshot by ID
   */
  getSnapshot(snapshotId: string): StateSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Load snapshot from disk
   */
  async loadSnapshot(sessionId: string, snapshotId: string): Promise<StateSnapshot | null> {
    const snapshotPath = path.join(this.dataDir, sessionId, `${snapshotId}.json`);

    try {
      const data = await fs.readFile(snapshotPath, 'utf-8');
      const snapshot = JSON.parse(data) as StateSnapshot;
      this.snapshots.set(snapshot.id, snapshot);
      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * Get all snapshots for a session
   */
  async getSessionSnapshots(sessionId: string): Promise<StateSnapshot[]> {
    const sessionDir = path.join(this.dataDir, sessionId);

    try {
      const files = await fs.readdir(sessionDir);
      const snapshots: StateSnapshot[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = await fs.readFile(path.join(sessionDir, file), 'utf-8');
            snapshots.push(JSON.parse(data));
          } catch {
            // Skip invalid files
          }
        }
      }

      return snapshots.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Generate injectable script that includes all state restoration
   */
  generateStateBundle(snapshot: StateSnapshot): string {
    return `
<!-- Merlin State Bundle -->
<script>
${this.getRestoreScript(snapshot)}
</script>
`;
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(
    snapshot1: StateSnapshot,
    snapshot2: StateSnapshot
  ): {
    added: string[];
    removed: string[];
    changed: string[];
  } {
    const changes = {
      added: [] as string[],
      removed: [] as string[],
      changed: [] as string[],
    };

    // Compare localStorage
    const ls1Keys = Object.keys(snapshot1.storage.localStorage);
    const ls2Keys = Object.keys(snapshot2.storage.localStorage);

    for (const key of ls2Keys) {
      if (!ls1Keys.includes(key)) {
        changes.added.push(`localStorage.${key}`);
      } else if (
        snapshot1.storage.localStorage[key] !== snapshot2.storage.localStorage[key]
      ) {
        changes.changed.push(`localStorage.${key}`);
      }
    }

    for (const key of ls1Keys) {
      if (!ls2Keys.includes(key)) {
        changes.removed.push(`localStorage.${key}`);
      }
    }

    // Compare sessionStorage similarly
    const ss1Keys = Object.keys(snapshot1.storage.sessionStorage);
    const ss2Keys = Object.keys(snapshot2.storage.sessionStorage);

    for (const key of ss2Keys) {
      if (!ss1Keys.includes(key)) {
        changes.added.push(`sessionStorage.${key}`);
      } else if (
        snapshot1.storage.sessionStorage[key] !== snapshot2.storage.sessionStorage[key]
      ) {
        changes.changed.push(`sessionStorage.${key}`);
      }
    }

    for (const key of ss1Keys) {
      if (!ss2Keys.includes(key)) {
        changes.removed.push(`sessionStorage.${key}`);
      }
    }

    return changes;
  }

  // Private methods

  private async saveSnapshot(snapshot: StateSnapshot, sessionId: string): Promise<void> {
    const sessionDir = path.join(this.dataDir, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const snapshotPath = path.join(sessionDir, `${snapshot.id}.json`);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

    console.log(`[StatePreserver] Saved snapshot ${snapshot.id}`);
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private hashSnapshot(snapshot: StateSnapshot): string {
    const content = JSON.stringify({
      storage: snapshot.storage,
      indexedDB: snapshot.indexedDB,
      customState: snapshot.customState,
    });

    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}

// Singleton instance
export const statePreserver = new StatePreserver();
