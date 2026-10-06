import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as unknown as T;
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    copy[k] = deepClone(v);
  }
  return copy as T;
}

export function createInMemoryAdminDb(): AdminFirestore {
  const store = new Map<string, Map<string, Record<string, unknown>>>();

  function getCollectionStore(colName: string): Map<string, Record<string, unknown>> {
    let col = store.get(colName);
    if (!col) {
      col = new Map<string, Record<string, unknown>>();
      store.set(colName, col);
    }
    return col;
  }

  function makeDocSnapshot(colName: string, docId: string, data: Record<string, unknown> | undefined) {
    return {
      id: docId,
      exists: data !== undefined,
      data: () => (data !== undefined ? deepClone(data) : undefined),
      ref: makeDocRef(colName, docId),
    };
  }

  function makeDocRef(colName: string, docId: string) {
    return {
      id: docId,
      path: `${colName}/${docId}`,
      get: async () => {
        const col = getCollectionStore(colName);
        const data = col.get(docId);
        return makeDocSnapshot(colName, docId, data);
      },
      set: async (data: Record<string, unknown>) => {
        const col = getCollectionStore(colName);
        col.set(docId, deepClone(data));
      },
      update: async (data: Record<string, unknown>) => {
        const col = getCollectionStore(colName);
        const existing = col.get(docId) || {};
        col.set(docId, { ...existing, ...deepClone(data) });
      },
      delete: async () => {
        const col = getCollectionStore(colName);
        col.delete(docId);
      },
    };
  }

  class InMemoryQuery {
    private colName: string;
    private filters: Array<{ field: string; op: string; val: unknown }> = [];
    private orderField?: string;
    private orderDir: 'asc' | 'desc' = 'asc';
    private limitCount?: number;

    constructor(colName: string) {
      this.colName = colName;
    }

    where(field: string, op: string, val: unknown): InMemoryQuery {
      const q = new InMemoryQuery(this.colName);
      q.filters = [...this.filters, { field, op, val }];
      q.orderField = this.orderField;
      q.orderDir = this.orderDir;
      q.limitCount = this.limitCount;
      return q;
    }

    orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): InMemoryQuery {
      const q = new InMemoryQuery(this.colName);
      q.filters = [...this.filters];
      q.orderField = field;
      q.orderDir = dir;
      q.limitCount = this.limitCount;
      return q;
    }

    limit(n: number): InMemoryQuery {
      const q = new InMemoryQuery(this.colName);
      q.filters = [...this.filters];
      q.orderField = this.orderField;
      q.orderDir = this.orderDir;
      q.limitCount = n;
      return q;
    }

    async get() {
      const col = getCollectionStore(this.colName);
      let entries = Array.from(col.entries()).map(([id, data]) => ({ id, data }));

      for (const f of this.filters) {
        entries = entries.filter((e) => {
          const val = e.data[f.field];
          if (f.op === '==') return val === f.val;
          if (f.op === '>=') return typeof val === 'number' && typeof f.val === 'number' && val >= f.val;
          if (f.op === '<=') return typeof val === 'number' && typeof f.val === 'number' && val <= f.val;
          if (f.op === '>') return typeof val === 'number' && typeof f.val === 'number' && val > f.val;
          if (f.op === '<') return typeof val === 'number' && typeof f.val === 'number' && val < f.val;
          return true;
        });
      }

      if (this.orderField) {
        const field = this.orderField;
        const dir = this.orderDir;
        entries.sort((a, b) => {
          const va = a.data[field];
          const vb = b.data[field];
          if (typeof va === 'number' && typeof vb === 'number') {
            return dir === 'desc' ? vb - va : va - vb;
          }
          const sa = String(va || '');
          const sb = String(vb || '');
          return dir === 'desc' ? sb.localeCompare(sa) : sa.localeCompare(sb);
        });
      }

      if (typeof this.limitCount === 'number') {
        entries = entries.slice(0, this.limitCount);
      }

      const docs = entries.map((e) => makeDocSnapshot(this.colName, e.id, e.data));
      return {
        docs,
        size: docs.length,
        empty: docs.length === 0,
      };
    }
  }

  function makeCollectionRef(colName: string) {
    const query = new InMemoryQuery(colName);
    return {
      id: colName,
      doc: (docId: string) => makeDocRef(colName, docId),
      where: (field: string, op: string, val: unknown) => query.where(field, op, val),
      orderBy: (field: string, dir?: 'asc' | 'desc') => query.orderBy(field, dir),
      limit: (n: number) => query.limit(n),
      get: () => query.get(),
    };
  }

  let transactionQueue = Promise.resolve();

  const inMemoryDb = {
    collection: (colName: string) => makeCollectionRef(colName),
    runTransaction: async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
      // Transaction serialization: serialize concurrent transactions to simulate OCC serializability
      const current = transactionQueue;
      let resolveNext: () => void;
      transactionQueue = new Promise<void>((resolve) => {
        resolveNext = resolve;
      });

      await current;
      try {
        const stagedWrites: Array<() => void> = [];
        const tx = {
          get: async (docRef: any) => {
            return docRef.get();
          },
          set: (docRef: any, data: Record<string, unknown>) => {
            stagedWrites.push(() => {
              const parts = docRef.path.split('/');
              const col = getCollectionStore(parts[0]);
              col.set(parts[1], deepClone(data));
            });
            return tx;
          },
          update: (docRef: any, data: Record<string, unknown>) => {
            stagedWrites.push(() => {
              const parts = docRef.path.split('/');
              const col = getCollectionStore(parts[0]);
              const existing = col.get(parts[1]) || {};
              col.set(parts[1], { ...existing, ...deepClone(data) });
            });
            return tx;
          },
          delete: (docRef: any) => {
            stagedWrites.push(() => {
              const parts = docRef.path.split('/');
              const col = getCollectionStore(parts[0]);
              col.delete(parts[1]);
            });
            return tx;
          },
        };

        const result = await fn(tx);
        for (const write of stagedWrites) {
          write();
        }
        return result;
      } finally {
        resolveNext!();
      }
    },
    batch: () => {
      const stagedWrites: Array<() => void> = [];
      return {
        set: (docRef: any, data: Record<string, unknown>) => {
          stagedWrites.push(() => {
            const parts = docRef.path.split('/');
            const col = getCollectionStore(parts[0]);
            col.set(parts[1], deepClone(data));
          });
        },
        update: (docRef: any, data: Record<string, unknown>) => {
          stagedWrites.push(() => {
            const parts = docRef.path.split('/');
            const col = getCollectionStore(parts[0]);
            const existing = col.get(parts[1]) || {};
            col.set(parts[1], { ...existing, ...deepClone(data) });
          });
        },
        delete: (docRef: any) => {
          stagedWrites.push(() => {
            const parts = docRef.path.split('/');
            const col = getCollectionStore(parts[0]);
            col.delete(parts[1]);
          });
        },
        commit: async () => {
          for (const write of stagedWrites) {
            write();
          }
        },
      };
    },
  };

  return inMemoryDb as unknown as AdminFirestore;
}
