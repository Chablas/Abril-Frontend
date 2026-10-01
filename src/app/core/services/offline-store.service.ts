import { Injectable } from '@angular/core';

/**
 * Almacén local (IndexedDB) para trabajar SIN conexión:
 *  - "cache": respuestas del servidor que el wizard necesita (catálogos, lista de trabajadores del proyecto).
 *  - "paquetes": ATS grupales armados sin señal, con las firmas capturadas, pendientes de subir.
 * Todo método falla en silencio si IndexedDB no está disponible (modo privado, SSR): la app sigue funcionando en línea.
 */
@Injectable({ providedIn: 'root' })
export class OfflineStore {
  private static readonly DB = 'abril-offline';
  private static readonly VERSION = 1;
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private abrir(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(OfflineStore.DB, OfflineStore.VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'k' });
        if (!db.objectStoreNames.contains('paquetes')) db.createObjectStore('paquetes', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return this.dbPromise;
  }

  private async tx<T>(store: 'cache' | 'paquetes', modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
    const db = await this.abrir();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = fn(db.transaction(store, modo).objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  // ── Caché de respuestas ────────────────────────────────────────────────
  async guardarCache(clave: string, valor: unknown): Promise<void> {
    await this.tx('cache', 'readwrite', (s) => s.put({ k: clave, v: valor, t: Date.now() }));
  }

  async leerCache<T>(clave: string): Promise<T | null> {
    const fila = await this.tx<{ k: string; v: T } | undefined>('cache', 'readonly', (s) => s.get(clave));
    return fila?.v ?? null;
  }

  // ── Paquetes pendientes ────────────────────────────────────────────────
  async guardarPaquete<T extends { id: string }>(p: T): Promise<void> {
    await this.tx('paquetes', 'readwrite', (s) => s.put(p));
  }

  async leerPaquete<T>(id: string): Promise<T | null> {
    return (await this.tx<T | undefined>('paquetes', 'readonly', (s) => s.get(id))) ?? null;
  }

  async listarPaquetes<T>(): Promise<T[]> {
    return (await this.tx<T[]>('paquetes', 'readonly', (s) => s.getAll())) ?? [];
  }

  async eliminarPaquete(id: string): Promise<void> {
    await this.tx('paquetes', 'readwrite', (s) => s.delete(id));
  }
}
