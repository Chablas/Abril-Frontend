import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { SolicitudSalidaFormDataDto } from '../dtos/solicitud-salida-form-data.dto';
import { SolicitudSalidaCreateDto } from '../dtos/solicitud-salida-create.dto';
import { SolicitudSalidaListResultDto } from '../dtos/solicitud-salida-list-item.dto';
import { SolicitudSalidaFilterDataDto } from '../dtos/solicitud-salida-filter-data.dto';
import { RendirResultDto } from '../dtos/solicitud-salida-rendir.dto';

@Injectable({ providedIn: 'root' })
export class SolicitudSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/solicitud-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Listado filtrado + los números de las tarjetas, contados sobre ese mismo conjunto. Vienen
   * juntos para que un cambio de filtro se resuelva en una sola petición.
   */
  getMySolicitudes(
    lugarProyectoId: number | null = null,
    estadoAprobacion: string | null = null,
    estadoRendicion: string | null = null,
    rendicionAnio: number | null = null,
    rendicionMes: number | null = null,
  ): Observable<SolicitudSalidaListResultDto> {
    let params = new HttpParams();
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    if (rendicionAnio != null && rendicionMes != null) {
      params = params.set('rendicionAnio', rendicionAnio).set('rendicionMes', rendicionMes);
    }
    return this.http.get<SolicitudSalidaListResultDto>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<SolicitudSalidaFilterDataDto> {
    return this.http.get<SolicitudSalidaFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getFormData(): Observable<SolicitudSalidaFormDataDto> {
    return this.http.get<SolicitudSalidaFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  /**
   * Crea la solicitud (multipart): `data` = JSON del dto; `adjuntos` +
   * `adjuntosTrayectoIndex` = documento adjunto por índice de trayecto (0-based),
   * obligatorio cuando el motivo elegido requiere documento.
   */
  create(
    dto: SolicitudSalidaCreateDto,
    adjuntos: { trayectoIndex: number; file: File }[] = [],
  ): Observable<{ id: number; message: string }> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));
    adjuntos.forEach((a) => {
      formData.append('adjuntos', a.file, a.file.name);
      formData.append('adjuntosTrayectoIndex', a.trayectoIndex.toString());
    });
    return this.http.post<{ id: number; message: string }>(this.apiUrl, formData, {
      headers: this.headers,
    });
  }

  /** Cancela una solicitud propia que esté Pendiente (registrada por error o salida no realizada). */
  cancelar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/cancelar`, {}, {
      headers: this.headers,
    });
  }

  /**
   * El trabajador rinde sus propias solicitudes seleccionadas: el backend genera la planilla de
   * gasto por movilidad (la guarda, no la devuelve) y la envía a primera revisión con sus correos.
   */
  marcarRendidasBulk(ids: number[]): Observable<RendirResultDto> {
    return this.http.patch<RendirResultDto>(
      `${this.apiUrl}/marcar-rendidas`,
      { ids },
      { headers: this.headers },
    );
  }

  /**
   * Rinde de una vez TODAS las solicitudes propias del mes indicado (sin año/mes, el anterior) que
   * estén aptas —aprobadas, no rendidas y con las capturas de sus trayectos reembolsables— y envía
   * la planilla a primera revisión, igual que `marcarRendidasBulk`. Es lo que
   * ejecuta "seleccionar todas las del mes": la selección vive en el servidor, no en los ids de la
   * página. El conteo real viene en `rendidas`.
   */
  rendirMes(anio: number | null = null, mes: number | null = null): Observable<RendirResultDto> {
    let params = new HttpParams();
    if (anio != null && mes != null) params = params.set('anio', anio).set('mes', mes);
    return this.http.patch<RendirResultDto>(`${this.apiUrl}/rendir-mes`, {}, {
      headers: this.headers,
      params,
    });
  }
}
