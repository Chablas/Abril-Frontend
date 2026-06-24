import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  AmonestacionInitDto,
  AmonestacionCreateRequest,
  AmonestacionCreadaDto,
  AmonestacionListQuery,
  AmonestacionListItemDto,
  AmonestacionPagedResult,
  AmonestacionDetalleDto,
  AmonestacionDashboardDto,
  WorkerPuntajeDto,
} from '../dtos/amonestacion.dtos';

@Injectable({ providedIn: 'root' })
export class AmonestacionService {
  private base = `${environment.apiUrl}api/v1/ssoma-amonestaciones`;

  constructor(private http: HttpClient) {}

  getInit(): Observable<AmonestacionInitDto> {
    return this.http.get<AmonestacionInitDto>(`${this.base}/init`);
  }

  crear(req: AmonestacionCreateRequest): Observable<AmonestacionCreadaDto> {
    return this.http.post<AmonestacionCreadaDto>(this.base, req);
  }

  getLista(q: AmonestacionListQuery): Observable<AmonestacionPagedResult<AmonestacionListItemDto>> {
    let params = new HttpParams();
    if (q.proyectoId)    params = params.set('proyectoId', q.proyectoId);
    if (q.workerId)      params = params.set('workerId', q.workerId);
    if (q.tipoSancionId) params = params.set('tipoSancionId', q.tipoSancionId);
    if (q.fechaDesde)    params = params.set('fechaDesde', q.fechaDesde);
    if (q.fechaHasta)    params = params.set('fechaHasta', q.fechaHasta);
    if (q.page)          params = params.set('page', q.page);
    if (q.pageSize)      params = params.set('pageSize', q.pageSize);
    return this.http.get<AmonestacionPagedResult<AmonestacionListItemDto>>(this.base, { params });
  }

  getDashboard(): Observable<AmonestacionDashboardDto> {
    return this.http.get<AmonestacionDashboardDto>(`${this.base}/dashboard`);
  }

  getDetalle(id: number): Observable<AmonestacionDetalleDto> {
    return this.http.get<AmonestacionDetalleDto>(`${this.base}/${id}`);
  }

  getPuntajeWorker(workerId: number): Observable<WorkerPuntajeDto> {
    return this.http.get<WorkerPuntajeDto>(`${this.base}/worker/${workerId}/puntaje`);
  }

  getPdfUrl(id: number): string {
    return `${this.base}/${id}/pdf`;
  }
}
