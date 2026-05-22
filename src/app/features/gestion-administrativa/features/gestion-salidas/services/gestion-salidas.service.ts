import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { GestionSalidaFilterDataDto, GestionSalidaListItemDto } from '../dtos/gestion-salida.dto';

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
  ): Observable<GestionSalidaListItemDto[]> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    return this.http.get<GestionSalidaListItemDto[]>(this.apiUrl, { headers: this.headers, params });
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
  ): Observable<Blob> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    return this.http.get(`${this.apiUrl}/exportar-excel`, {
      headers: this.headers,
      params,
      responseType: 'blob',
    });
  }
}
