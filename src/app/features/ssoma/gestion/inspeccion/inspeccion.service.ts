import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  InspeccionDashboardDto,
  InspeccionDetalleDto,
  InspeccionListItemDto,
  InspeccionTipoDto,
  InspeccionChecklistItemDto,
  CrearInspeccionRequest,
  CerrarHallazgoRequest,
} from './inspeccion.dtos';

@Injectable({ providedIn: 'root' })
export class InspeccionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-inspeccion`;

  getCatalogos(): Observable<{ tipos: InspeccionTipoDto[] }> {
    return this.http.get<{ tipos: InspeccionTipoDto[] }>(`${this.base}/catalogos`);
  }

  getChecklist(tipoId: number): Observable<InspeccionChecklistItemDto[]> {
    return this.http.get<InspeccionChecklistItemDto[]>(`${this.base}/checklist/${tipoId}`);
  }

  getList(params: {
    proyectoId?: number;
    tipoId?: number;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    pageSize?: number;
  }): Observable<{ items: InspeccionListItemDto[]; total: number; page: number; pageSize: number }> {
    let p = new HttpParams();
    if (params.proyectoId) p = p.set('proyectoId', params.proyectoId);
    if (params.tipoId) p = p.set('tipoId', params.tipoId);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<{ items: InspeccionListItemDto[]; total: number; page: number; pageSize: number }>(
      this.base,
      { params: p },
    );
  }

  getDashboard(proyectoId?: number, anio?: number): Observable<InspeccionDashboardDto> {
    let p = new HttpParams();
    if (proyectoId) p = p.set('proyectoId', proyectoId);
    if (anio) p = p.set('anio', anio);
    return this.http.get<InspeccionDashboardDto>(`${this.base}/dashboard`, { params: p });
  }

  getDetalle(id: number): Observable<InspeccionDetalleDto> {
    return this.http.get<InspeccionDetalleDto>(`${this.base}/${id}`);
  }

  crear(request: CrearInspeccionRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, request);
  }

  cerrarHallazgo(id: number, request: CerrarHallazgoRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrl}api/v1/ssoma-inspeccion-hallazgo/${id}/cerrar`,
      request,
    );
  }

  descargarPdf(id: number): Observable<Blob> {
    const token =
      typeof localStorage !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
    return this.http.get(`${this.base}/${id}/pdf`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
