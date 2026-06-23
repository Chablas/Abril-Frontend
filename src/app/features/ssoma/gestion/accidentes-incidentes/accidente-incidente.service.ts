import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  FlashReportInicializarDto,
  FlashReportListItemDto,
  FlashReportDetalleDto,
  CrearFlashReportRequest,
  ActualizarFlashReportRequest,
} from './accidente-incidente.dtos';

@Injectable({ providedIn: 'root' })
export class AccidenteIncidenteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  inicializar(): Observable<FlashReportInicializarDto> {
    return this.http.get<FlashReportInicializarDto>(`${this.base}/inicializar`, {
      headers: this.authHeaders(),
    });
  }

  getList(params: {
    proyectoId?: number;
    tipoId?: number;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    soloEnviados?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<{ items: FlashReportListItemDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    let p = new HttpParams();
    if (params.proyectoId) p = p.set('proyectoId', params.proyectoId);
    if (params.tipoId) p = p.set('tipoId', params.tipoId);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    if (params.soloEnviados != null) p = p.set('soloEnviados', params.soloEnviados);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<any>(this.base, { headers: this.authHeaders(), params: p });
  }

  getDetalle(id: number): Observable<FlashReportDetalleDto> {
    return this.http.get<FlashReportDetalleDto>(`${this.base}/${id}`, { headers: this.authHeaders() });
  }

  crear(request: CrearFlashReportRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, request, { headers: this.authHeaders() });
  }

  actualizar(id: number, request: ActualizarFlashReportRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, request, { headers: this.authHeaders() });
  }

  enviar(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/enviar`, {}, { headers: this.authHeaders() });
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: this.authHeaders() });
  }
}
