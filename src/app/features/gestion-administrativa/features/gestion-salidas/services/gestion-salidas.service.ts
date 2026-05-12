import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getAll(workerId: number | null, lugarProyectoId: number | null): Observable<GestionSalidaListItemDto[]> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
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

  downloadExcel(workerId: number | null, lugarProyectoId: number | null): Observable<Blob> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    return this.http.get(`${this.apiUrl}/exportar-excel`, {
      headers: this.headers,
      params,
      responseType: 'blob',
    });
  }
}
