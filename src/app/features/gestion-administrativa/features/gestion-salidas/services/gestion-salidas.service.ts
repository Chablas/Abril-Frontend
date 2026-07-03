import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  GestionSalidaDetalleDto,
  GestionSalidaFilterDataDto,
  GestionSalidaListItemDto,
  PagedResponseDto,
} from '../dtos/gestion-salida.dto';

@Injectable({ providedIn: 'root' })
export class GestionSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/gestion-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(
    workerId: number | null,
    lugarProyectoId: number | null,
    estadoRendicion: string | null = null,
    estadoAprobacion: string | null = null,
    page = 1,
    sortBy: string | null = null,
    sortDir: 'asc' | 'desc' | null = null,
    areaScopeIds: number[] | null = null,
  ): Observable<PagedResponseDto<GestionSalidaListItemDto>> {
    let params = new HttpParams().set('page', page);
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (sortBy)                  params = params.set('sortBy', sortBy);
    if (sortDir)                 params = params.set('sortDir', sortDir);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    return this.http.get<PagedResponseDto<GestionSalidaListItemDto>>(this.apiUrl, { headers: this.headers, params });
  }

  getDetalle(id: number): Observable<GestionSalidaDetalleDto> {
    return this.http.get<GestionSalidaDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  getFilterData(): Observable<GestionSalidaFilterDataDto> {
    return this.http.get<GestionSalidaFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  aprobar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/aprobar`, {}, {
      headers: this.headers,
    });
  }

  /** Registra (o limpia si hora=null) la hora real de salida. Solo para rol USUARIO DE RECEPCIÓN. */
  setHoraSalidaReal(id: number, hora: string | null): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${id}/hora-salida-real`,
      { horaSalidaReal: hora },
      { headers: this.headers },
    );
  }

  rechazar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/rechazar`, {}, {
      headers: this.headers,
    });
  }

  /**
   * Marca las solicitudes como rendidas Y descarga la planilla de gasto por movilidad.
   * El backend responde con un .xlsx; el conteo de procesadas viene en el header X-Rendidas-Count.
   */
  marcarRendidasBulk(ids: number[]): Observable<HttpResponse<Blob>> {
    return this.http.patch(
      `${this.apiUrl}/marcar-rendidas`,
      { ids },
      {
        headers: this.headers,
        responseType: 'blob',
        observe: 'response',
      },
    );
  }

  downloadExcel(
    workerId: number | null,
    lugarProyectoId: number | null,
    estadoRendicion: string | null = null,
    estadoAprobacion: string | null = null,
    areaScopeIds: number[] | null = null,
  ): Observable<Blob> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    return this.http.get(`${this.apiUrl}/exportar-excel`, {
      headers: this.headers,
      params,
      responseType: 'blob',
    });
  }
}
