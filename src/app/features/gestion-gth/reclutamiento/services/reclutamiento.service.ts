import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AsignacionGth,
  BandejaReclutamiento,
  DetalleRequerimientoGth,
  EstadoTransicionResult,
} from '../dtos/reclutamiento.dto';

interface MessageResult {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ReclutamientoService {
  // API de dominio de reclutamiento (compartida): sirve los endpoints de la vista de GTH.
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/reclutamiento`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Bandeja de GTH: tarjeta "En proceso" + tabla de solicitudes de contratación, en una sola petición. */
  getBandeja(): Observable<BandejaReclutamiento> {
    return this.http.get<BandejaReclutamiento>(`${this.apiUrl}/bandeja`, {
      headers: this.headers,
    });
  }

  /** Actualiza la prioridad (Alta/Media/Baja) de un requerimiento desde la bandeja. */
  updatePrioridad(requerimientoId: number, prioridadId: number): Observable<MessageResult> {
    return this.http.patch<MessageResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/prioridad`,
      { prioridadId },
      { headers: this.headers },
    );
  }

  /** Detalle del requerimiento (modal del ojo): cabecera + asignación + catálogos + canales, en una sola petición. */
  getDetalle(requerimientoId: number): Observable<DetalleRequerimientoGth> {
    return this.http.get<DetalleRequerimientoGth>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/detalle-gth`,
      { headers: this.headers },
    );
  }

  /** Guarda la asignación interna de GTH (reemplaza los 4 campos del modal). */
  updateAsignacion(requerimientoId: number, asignacion: AsignacionGth): Observable<MessageResult> {
    return this.http.patch<MessageResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/asignacion-gth`,
      asignacion,
      { headers: this.headers },
    );
  }

  /**
   * Registra los canales donde se publicó la vacante y avanza el requerimiento a la fase
   * PUBLICACION. No publica en los portales (sin APIs integradas): solo registra y continúa
   * el flujo. Devuelve el estado resultante.
   */
  publicar(requerimientoId: number, canalIds: number[]): Observable<EstadoTransicionResult> {
    return this.http.put<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/publicaciones`,
      { canalIds },
      { headers: this.headers },
    );
  }

  /** Inicia la revisión de CV: avanza el requerimiento de PUBLICACION a LONG_LIST. */
  iniciarRevisionCv(requerimientoId: number): Observable<EstadoTransicionResult> {
    return this.http.patch<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/iniciar-revision-cv`,
      {},
      { headers: this.headers },
    );
  }

  /**
   * Envía la long list al solicitante (multipart): metadatos de cada candidato en `data`
   * y los archivos (CV e informe opcional) como form files con claves `cv_i` / `informe_i`.
   * El backend envía el correo configurado y avanza el requerimiento a LONG_LIST_ENVIADA.
   */
  enviarLongList(
    requerimientoId: number,
    candidatos: LongListCandidatoEnvio[],
  ): Observable<EstadoTransicionResult> {
    const formData = new FormData();
    const meta = candidatos.map((c, i) => {
      formData.append(`cv_${i}`, c.cv, c.cv.name);
      const informeKey = c.informe ? `informe_${i}` : null;
      if (c.informe) formData.append(`informe_${i}`, c.informe, c.informe.name);
      return {
        nombre: c.nombre,
        fuenteNombre: c.fuenteNombre,
        comentario: c.comentario,
        cvKey: `cv_${i}`,
        informeKey,
      };
    });
    formData.append('data', JSON.stringify({ candidatos: meta }));

    return this.http.post<EstadoTransicionResult>(
      `${this.apiUrl}/requerimiento/${requerimientoId}/long-list/enviar`,
      formData,
      { headers: this.headers },
    );
  }
}

/** Candidato de la long list a enviar (CV obligatorio, informe opcional). */
export interface LongListCandidatoEnvio {
  nombre: string;
  /** Nombre de la fuente de reclutamiento (canal), para mostrar en el correo. */
  fuenteNombre: string | null;
  comentario: string;
  cv: File;
  informe: File | null;
}
