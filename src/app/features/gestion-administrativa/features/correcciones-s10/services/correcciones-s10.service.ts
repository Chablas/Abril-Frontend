import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CorreoAvisoDto } from '../../../shared/correo-aviso';
import { SolicitudSalidaDetalleDto } from '../../../shared/dtos/salida-detalle.dto';
import {
  AtenderCorreccionS10Dto,
  CorreccionS10BulkResultDto,
  CorreccionS10DetalleDto,
  CorreccionS10FilterDataDto,
  CorreccionS10ListResultDto,
} from '../dtos/correccion-s10.dto';

@Injectable({ providedIn: 'root' })
export class CorreccionesS10Service {
  private readonly apiUrl =
    `${environment.apiUrl}api/v1/gestion-administrativa/correcciones-s10`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Correcciones vivas del filtro + los números de las tarjetas, contados sobre ese mismo
   * conjunto. Vienen juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getAll(
    estado: string | null = null,
    workerId: number | null = null,
    q: string | null = null,
    periodoAnio: number | null = null,
    periodoMes: number | null = null,
  ): Observable<CorreccionS10ListResultDto> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (workerId != null) params = params.set('workerId', workerId);
    if (q) params = params.set('q', q);
    if (periodoAnio != null && periodoMes != null) {
      params = params.set('periodoAnio', periodoAnio).set('periodoMes', periodoMes);
    }
    return this.http.get<CorreccionS10ListResultDto>(this.apiUrl, {
      headers: this.headers,
      params,
    });
  }

  getFilterData(): Observable<CorreccionS10FilterDataDto> {
    return this.http.get<CorreccionS10FilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  /** Una corrección con las rendiciones de su consolidado y sus salidas. */
  getDetalle(id: number): Observable<CorreccionS10DetalleDto> {
    return this.http.get<CorreccionS10DetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /**
   * El detalle de una salida de la bandeja, en consulta: trayectos, capturas y adjuntos. Es lo que
   * abre el ojo de la tabla de salidas del detalle de la corrección.
   */
  getSalidaDetalle(solicitudId: number): Observable<SolicitudSalidaDetalleDto> {
    return this.http.get<SolicitudSalidaDetalleDto>(`${this.apiUrl}/salidas/${solicitudId}/detalle`, {
      headers: this.headers,
    });
  }

  /**
   * A quién le llegaría el aviso al consolidador si se confirmara la selección. Se pide al apretar
   * el botón —no al cargar la pantalla— porque depende de qué está seleccionado, y lo resuelve el
   * servidor para que la confirmación no pueda desalinearse de Configuración → Correos.
   */
  correoPreview(correccionIds: number[]): Observable<CorreoAvisoDto[]> {
    return this.http.post<CorreoAvisoDto[]>(`${this.apiUrl}/correo-preview`, correccionIds, {
      headers: this.headers,
    });
  }

  /**
   * El check de confirmación: la corrección ya se hizo en el S10. Sirve para una fila o para
   * varias — la bandeja usa el mismo endpoint desde el detalle y desde la tabla.
   */
  atender(accion: AtenderCorreccionS10Dto): Observable<CorreccionS10BulkResultDto> {
    return this.http.patch<CorreccionS10BulkResultDto>(`${this.apiUrl}/atender`, accion, {
      headers: this.headers,
    });
  }
}
