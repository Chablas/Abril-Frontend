import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ObservacionListResponseDTO,
  ObservacionFiltrosDTO,
  ObservacionesQueryParams,
  CreateObservacionBody,
  ObservacionListItemDTO,
  ObservacionDashboardDTO,
} from '../../dtos/arquitectura-comercial/observaciones.model';

@Injectable({ providedIn: 'root' })
export class ObservacionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial/observaciones`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getObservaciones(query: ObservacionesQueryParams): Observable<ObservacionListResponseDTO> {
    let params = new HttpParams()
      .set('pagina', query.pagina)
      .set('porPagina', query.porPagina);
    if (query.proyectoId) params = params.set('proyectoId', query.proyectoId);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.partida) params = params.set('partida', query.partida);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<ObservacionListResponseDTO>(this.apiUrl, { params, headers: this.authHeaders() });
  }

  getFiltros(): Observable<ObservacionFiltrosDTO> {
    return this.http.get<ObservacionFiltrosDTO>(`${this.apiUrl}/filtros`, { headers: this.authHeaders() });
  }

  getDashboard(desde?: string | null, hasta?: string | null, proyectoId?: number | null): Observable<ObservacionDashboardDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<ObservacionDashboardDTO>(`${this.apiUrl}/dashboard`, { params, headers: this.authHeaders() });
  }

  createObservacion(body: CreateObservacionBody, foto: File | null): Observable<ObservacionListItemDTO> {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== null && value !== undefined) form.append(key, String(value));
    });
    if (foto) form.append('foto', foto);

    return this.http.post<ObservacionListItemDTO>(this.apiUrl, form, { headers: this.authHeaders() });
  }

  levantarObservacion(id: number, comentario: string | null, foto: File | null): Observable<ObservacionListItemDTO> {
    const form = new FormData();
    if (comentario) form.append('comentario', comentario);
    if (foto) form.append('foto', foto);

    return this.http.post<ObservacionListItemDTO>(`${this.apiUrl}/${id}/levantar`, form, { headers: this.authHeaders() });
  }
}
