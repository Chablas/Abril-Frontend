import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CostoDashboardDTO,
  CostoEvolucionDTO,
  CostoFiltrosDTO,
  CostoMatrizDTO,
  UpsertCostoMetaBody,
  UpsertCostoProyeccionBody,
  UpsertCostoRegistroBody,
} from '../../dtos/arquitectura-comercial/costos.model';

@Injectable({ providedIn: 'root' })
export class CostosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial/costos`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getFiltros(): Observable<CostoFiltrosDTO> {
    return this.http.get<CostoFiltrosDTO>(`${this.apiUrl}/filtros`, { headers: this.authHeaders() });
  }

  getMatriz(proyectoId: number, anio: number, mes: number): Observable<CostoMatrizDTO> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('anio', anio).set('mes', mes);
    return this.http.get<CostoMatrizDTO>(`${this.apiUrl}/matriz`, { params, headers: this.authHeaders() });
  }

  upsertRegistro(body: UpsertCostoRegistroBody): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/registro`, body, { headers: this.authHeaders() });
  }

  upsertProyeccion(body: UpsertCostoProyeccionBody): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/proyeccion`, body, { headers: this.authHeaders() });
  }

  getDashboard(anio: number, mes: number): Observable<CostoDashboardDTO> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http.get<CostoDashboardDTO>(`${this.apiUrl}/dashboard`, { params, headers: this.authHeaders() });
  }

  getEvolucion(anioDesde: number, mesDesde: number, cantidadMeses = 12): Observable<CostoEvolucionDTO> {
    const params = new HttpParams().set('anioDesde', anioDesde).set('mesDesde', mesDesde).set('cantidadMeses', cantidadMeses);
    return this.http.get<CostoEvolucionDTO>(`${this.apiUrl}/evolucion`, { params, headers: this.authHeaders() });
  }

  upsertMeta(body: UpsertCostoMetaBody): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/meta`, body, { headers: this.authHeaders() });
  }
}
