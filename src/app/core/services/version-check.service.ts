import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

interface VersionPayload {
  hash: string;
  builtAt?: string;
}

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private currentHash: string | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private started = false;

  /** Emite true cuando se detecta una versión nueva en el servidor. */
  newVersionAvailable$ = new BehaviorSubject<boolean>(false);

  private sw = inject(SwUpdate, { optional: true });

  constructor(private http: HttpClient) {}

  /** Arranca el polling. Llamar UNA vez desde el Layout. */
  start(intervalMs: number = 5 * 60 * 1000): void {
    // No correr en SSR
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.started) return;
    this.started = true;

    // Chequeo inicial
    this.check();

    // Polling regular
    this.startPolling(intervalMs);

    // Pausar cuando la pestaña no es visible, reanudar al volver
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.check(); // chequeo inmediato al volver al foco
        this.startPolling(intervalMs);
      } else {
        this.stopPolling();
      }
    });
  }

  /** Recarga la página para tomar el bundle nuevo. */
  reload(): void {
    if (typeof window === 'undefined') return;
    // Con la PWA instalada, un simple reload serviría una vez más el bundle viejo desde la caché del service
    // worker: primero se pide y activa la versión nueva, y recién ahí se recarga.
    if (this.sw?.isEnabled) {
      this.sw.checkForUpdate()
        .then(() => this.sw!.activateUpdate())
        .catch(() => undefined)
        .finally(() => window.location.reload());
      return;
    }
    window.location.reload();
  }

  private startPolling(intervalMs: number): void {
    this.stopPolling();
    this.intervalId = setInterval(() => this.check(), intervalMs);
  }

  private stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private check(): void {
    // ?t= evita que el navegador cachee el propio version.json
    const url = `/version.json?t=${Date.now()}`;
    this.http.get<VersionPayload>(url).subscribe({
      next: ({ hash }) => {
        if (!hash) return;
        if (this.currentHash === null) {
          this.currentHash = hash;
          return;
        }
        if (this.currentHash !== hash && !this.newVersionAvailable$.value) {
          this.newVersionAvailable$.next(true);
        }
      },
      error: () => {
        // Silencioso. En el siguiente intervalo se reintenta.
      },
    });
  }
}
