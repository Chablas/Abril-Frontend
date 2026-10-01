import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AtsService } from './ats.service';
import { OfflineStore } from '../../../../../core/services/offline-store.service';
import { PaqueteOffline } from './ats-offline.models';

@Injectable({ providedIn: 'root' })
export class AtsOfflineService {
  constructor(private svc: AtsService, private store: OfflineStore) {}

  get enLinea(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  nuevoId(): string {
    const c = typeof crypto !== 'undefined' ? crypto : undefined;
    if (c && 'randomUUID' in c) return c.randomUUID();
    // Respaldo para navegadores sin randomUUID (contexto no seguro): formato v4.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  listar(): Promise<PaqueteOffline[]> {
    return this.store.listarPaquetes<PaqueteOffline>().then((l) => l.sort((a, b) => b.capturadoEn.localeCompare(a.capturadoEn)));
  }
  obtener(id: string): Promise<PaqueteOffline | null> { return this.store.leerPaquete<PaqueteOffline>(id); }
  guardar(p: PaqueteOffline): Promise<void> { return this.store.guardarPaquete(p); }
  eliminar(id: string): Promise<void> { return this.store.eliminarPaquete(id); }

  /** Descarga y deja en el teléfono lo que el wizard necesita (pasos por puesto, actividades, riesgos, torres…) con
   *  concurrencia baja para no saturar la red de obra. Un fallo individual no corta el resto. */
  async precargar(tareas: (() => Promise<unknown>)[], onProgreso?: (hecho: number, total: number) => void): Promise<void> {
    let hecho = 0;
    const total = tareas.length;
    const cola = [...tareas];
    const worker = async () => {
      while (cola.length) {
        const t = cola.shift()!;
        try { await t(); } catch { /* se omite: se reintenta la próxima vez que haya señal */ }
        hecho++;
        onProgreso?.(hecho, total);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }

  /** Sube el paquete: 1) crea el grupo (idempotente por ClientId), 2) envía cada firmante capturado. Se puede
   *  reintentar: lo ya enviado no se repite y un "Ya firmaste" se toma como enviado. Sin señal (status 0) corta y relanza. */
  async sincronizar(p: PaqueteOffline, onCambio: (p: PaqueteOffline) => void): Promise<PaqueteOffline> {
    if (!p.grupoToken) {
      const res = await firstValueFrom(this.svc.crearGrupoPublico(p.tokenProyecto, {
        workerId: p.autor.workerId,
        dniConfirmacion: p.autor.dniConfirmacion,
        contenido: p.contenido,
        clientId: p.id,
        capturadoEn: p.capturadoEn,
      }));
      p.grupoToken = res.qrToken;
      p.grupoId = res.id;
      await this.guardar(p);
      onCambio(p);
    }

    for (const a of p.adhesiones.filter((x) => x.estado !== 'Enviado')) {
      try {
        await firstValueFrom(this.svc.unirseAGrupo(p.grupoToken, {
          workerId: a.workerId,
          dniConfirmacion: a.dniConfirmacion,
          selfieBase64: a.selfieBase64,
          firmaBase64: '', // la firma sale de la firma digital registrada, no se dibuja
          horaDispositivo: a.horaDispositivo,
          lat: a.lat,
          lng: a.lng,
          precisionMetros: a.precisionMetros,
          aceptaConsentimiento: a.aceptaConsentimiento,
        }));
        a.estado = 'Enviado';
        a.error = undefined;
      } catch (e) {
        const err = e as HttpErrorResponse;
        if (err.status === 0) throw e;
        const msg: string = err.error?.message ?? 'No se pudo enviar.';
        if (err.status === 409 && /ya firmaste/i.test(msg)) { a.estado = 'Enviado'; a.error = undefined; }
        else { a.estado = 'Error'; a.error = msg; }
      }
      await this.guardar(p);
      onCambio(p);
    }

    p.estado = p.adhesiones.every((x) => x.estado === 'Enviado') ? 'Sincronizado' : 'Parcial';
    await this.guardar(p);
    onCambio(p);
    return p;
  }
}
