
export interface DBRecord {
  id: string;
  collection: string;
  data: any;
  text: string; // Searchable text representation
}

const DB_NAME = 'MillaExternalDB';
const STORE_NAME = 'knowledge_store';

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('collection', 'collection', { unique: false });
          // Full text search index isn't native, we'll do manual filtering
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error("IndexedDB Error", event);
        reject("Failed to open database");
      };
    });
  }

  async importFile(file: File, collectionName: string): Promise<number> {
    await this.init();
    const text = await file.text();
    let records: DBRecord[] = [];

    // Simple parser for JSON/CSV
    if (file.name.endsWith('.json')) {
      try {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : [json];
        records = arr.map((item, i) => ({
          id: `${collectionName}_${i}_${Date.now()}`,
          collection: collectionName,
          data: item,
          text: JSON.stringify(item).toLowerCase()
        }));
      } catch (e) {
        throw new Error("Invalid JSON format");
      }
    } else if (file.name.endsWith('.csv')) {
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      records = lines.slice(1).filter(l => l.trim()).map((line, i) => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((h, idx) => obj[h.trim()] = values[idx]?.trim());
        return {
          id: `${collectionName}_${i}_${Date.now()}`,
          collection: collectionName,
          data: obj,
          text: line.toLowerCase()
        };
      });
    }

    if (records.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let count = 0;
      records.forEach(r => {
        store.put(r);
        count++;
      });

      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject("Transaction failed");
    });
  }

  async search(query: string): Promise<DBRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      const results: DBRecord[] = [];
      const q = query.toLowerCase();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const record = cursor.value as DBRecord;
          // Basic keyword match
          if (record.text.includes(q)) {
            results.push(record);
          }
          if (results.length < 20) { // Limit results for context window
            cursor.continue();
          } else {
            resolve(results);
          }
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject("Search failed");
    });
  }

  async clearCollection(collectionName: string) {
    await this.init();
    // In a real app we'd use a cursor to delete range, simplified here to clear all or need index iteration
    // For MVP, we will just support clearing the whole DB or implement index deletion later.
    // Let's implement index deletion.
    return new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('collection');
        const request = index.openKeyCursor(IDBKeyRange.only(collectionName));

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            } else {
                resolve(); // Done
            }
        };
        request.onerror = () => reject("Delete failed");
    });
  }
}

export const databaseService = new DatabaseService();
