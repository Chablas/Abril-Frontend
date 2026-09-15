import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SolicitudSalidaDetalleDto } from '../dtos/salida-detalle.dto';

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

  /**
   * Guarda de un saque todo lo que se tocó en el modal de capturas: las capturas nuevas de
   * cualquiera de los trayectos de la salida y los montos e imágenes que se cambiaron en las que
   * ya estaban. Va en una sola llamada porque en la pantalla es un solo botón "Guardar" — y así
   * el backend resuelve la carpeta de SharePoint una vez para todo el lote en vez de una por fila.
   *
   * Las listas viajan en paralelo. La imagen de una edición es opcional, así que cada archivo de
   * reemplazo lleva aparte su posición dentro de `ediciones`.
   *
   * Devuelve el detalle ya actualizado, para repintar el modal sin pedirlo de nuevo.
   */
  guardarCapturas(
    solicitudId: number,
    nuevas: { trayectoId: number; file: File; monto: number }[],
    ediciones: { capturaId: number; monto: number; file: File | null }[],
  ): Observable<SolicitudSalidaDetalleDto> {
    const formData = new FormData();

    nuevas.forEach((n) => {
      formData.append('nuevasTrayectoIds', String(n.trayectoId));
      formData.append('nuevasMontos', String(n.monto));
      formData.append('nuevasFiles', n.file, n.file.name);
    });

    ediciones.forEach((e, i) => {
      formData.append('editIds', String(e.capturaId));
      formData.append('editMontos', String(e.monto));
      if (e.file) {
        formData.append('editFileIndices', String(i));
        formData.append('editFiles', e.file, e.file.name);
      }
    });

    return this.http.post<SolicitudSalidaDetalleDto>(
      `${this.apiUrl}/${solicitudId}/capturas`,
      formData,
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
