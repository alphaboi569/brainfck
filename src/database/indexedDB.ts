export class IndexedDB {
  private static db: IDBDatabase | null = null;
  private static DB_NAME = 'limitly';
  private static DB_VERSION = 1;

  static async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDB.DB_NAME, IndexedDB.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        IndexedDB.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Timer Sessions Store
        if (!db.objectStoreNames.contains('timer_sessions')) {
          const store = db.createObjectStore('timer_sessions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('type', 'type');
          store.createIndex('preset_id', 'preset_id');
          store.createIndex('completed', 'completed');
        }

        // Site Visits Store
        if (!db.objectStoreNames.contains('site_visits')) {
          const store = db.createObjectStore('site_visits', { keyPath: 'id', autoIncrement: true });
          store.createIndex('site_url', 'site_url');
          store.createIndex('start_time', 'start_time');
        }

        // Daily Stats Store
        if (!db.objectStoreNames.contains('daily_stats')) {
          const store = db.createObjectStore('daily_stats', { keyPath: 'date' });
          store.createIndex('date', 'date', { unique: true });
        }

        // Site Limits Store
        if (!db.objectStoreNames.contains('site_limits')) {
          const store = db.createObjectStore('site_limits', { keyPath: 'site_url' });
          store.createIndex('site_url', 'site_url', { unique: true });
        }
      };
    });
  }

  static async add<T>(storeName: string, data: T): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!IndexedDB.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = IndexedDB.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  static async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!IndexedDB.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = IndexedDB.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async update<T>(storeName: string, key: IDBValidKey, data: Partial<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!IndexedDB.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = IndexedDB.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const updatedData = { ...getRequest.result, ...data };
        const putRequest = store.put(updatedData);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  static async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!IndexedDB.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = IndexedDB.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!IndexedDB.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = IndexedDB.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}