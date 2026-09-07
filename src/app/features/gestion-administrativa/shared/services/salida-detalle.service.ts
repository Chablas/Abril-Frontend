import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  SolicitudSalidaCapturaDto,
  SolicitudSalidaDetalleDto,
} from '../dtos/salida-detalle.dto';

/**
 * El detalle de una salida y la edición de sus capturas de movilidad. Vive en el shared del módulo
 * porque lo usan dos pantallas: Solicitud de Salidas (el trabajador carga las capturas antes de
 * rendir) y Mis Rendiciones (las corrige al subsanar una rendición observada en primera revisión).
 *
 * Los endpoints son los de Solicitud de Salidas: la captura es de un trayecto de la salida, no de
 * la planilla, y el backend acota todo al trabajador del usuario autenticado.
 */
@Injectable({ providedIn: 'root' })
export class SalidaDetalleService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/solicitud-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Cabecera + trayectos con sus capturas y adjuntos. */
  getDetalle(id: number): Observable<SolicitudSalidaDetalleDto> {
    return this.http.get<SolicitudSalidaDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /** Sube capturas (imagen + monto) asociadas a un trayecto. */
  uploadCapturasToTrayecto(
    trayectoId: number,
    items: { file: File; monto: number }[],
  ): Observable<SolicitudSalidaCapturaDto[]> {
    const formData = new FormData();
    items.forEach((it) => {
      formData.append('files', it.file, it.file.name);
      formData.append('montos', it.monto.toString());
    });
    return this.http.post<SolicitudSalidaCapturaDto[]>(
      `${this.apiUrl}/trayectos/${trayectoId}/capturas`,
      formData,
      { headers: this.headers },
    );
  }

  /** Corrige el monto de una captura ya subida. */
  actualizarMontoCaptura(capturaId: number, monto: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/capturas/${capturaId}/monto`,
      { monto },
      { headers: this.headers },
    );
  }

  /**
   * Da de baja una captura. El backend la marca como eliminada (la fila queda para auditoría) y
   * deja de contar para el importe rendido y para la planilla.
   */
  eliminarCaptura(capturaId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/capturas/${capturaId}`, {
      headers: this.headers,
    });
  }
}
