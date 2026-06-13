import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  RacCategoriaDto,
  RacInfraccionDto,
  RacListQuery,
  RacPagedResult,
  RacListItemDto,
  RacDetalleDto,
  RacDashboardDto,
  RacCreateRequest,
  RacCreadoDto,
  RacCerrarRequest,
  RacFotoUploadResult,
  PenalidadListQuery,
  PenalidadListItemDto,
  PenalidadDetalleDto,
  PenalidadDescargaRequest,
  PenalidadResolverRequest,
} from '../dtos/rac.dtos';

@Injectable({ providedIn: 'root' })
export class RacService {
  private base = `${environment.apiUrl}api/v1/ssoma-rac`;
  private basePen = `${environment.apiUrl}api/v1/ssoma-rac-penalidad`;

  constructor(private http: HttpClient) {}

  // ── Catálogos ────────────────────────────────────────────────────

  getCategorias(): Observable<RacCategoriaDto[]> {
    return this.http.get<RacCategoriaDto[]>(`${this.base}/categorias`);
  }

  getInfracciones(): Observable<RacInfraccionDto[]> {
    return this.http.get<RacInfraccionDto[]>(`${this.base}/infracciones`);
  }

  getNiveles(projectId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/proyecto/${projectId}/niveles`);
  }

  // ── RAC ──────────────────────────────────────────────────────────

  getList(q: RacListQuery): Observable<RacPagedResult<RacListItemDto>> {
    const params = this.buildParams(q);
    return this.http.get<RacPagedResult<RacListItemDto>>(`${this.base}`, { params });
  }

  getDetalle(id: number): Observable<RacDetalleDto> {
    return this.http.get<RacDetalleDto>(`${this.base}/${id}`);
  }

  getDashboard(): Observable<RacDashboardDto> {
    return this.http.get<RacDashboardDto>(`${this.base}/dashboard`);
  }

  crear(req: RacCreateRequest): Observable<RacCreadoDto> {
    return this.http.post<RacCreadoDto>(`${this.base}`, req);
  }

  cerrar(id: number, req: RacCerrarRequest): Observable<RacDetalleDto> {
    return this.http.patch<RacDetalleDto>(`${this.base}/${id}/cerrar`, req);
  }

  subirFoto(id: number, file: File, tipo: string): Observable<RacFotoUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tipo', tipo);
    return this.http.post<RacFotoUploadResult>(`${this.base}/${id}/fotos`, fd);
  }

  getReportePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }

  // ── Penalidades ──────────────────────────────────────────────────

  getPenalidadList(q: PenalidadListQuery): Observable<RacPagedResult<PenalidadListItemDto>> {
    const params = this.buildParams(q);
    return this.http.get<RacPagedResult<PenalidadListItemDto>>(`${this.basePen}`, { params });
  }

  getPenalidadDetalle(id: number): Observable<PenalidadDetalleDto> {
    return this.http.get<PenalidadDetalleDto>(`${this.basePen}/${id}`);
  }

  presentarDescargo(id: number, req: PenalidadDescargaRequest): Observable<void> {
    return this.http.post<void>(`${this.basePen}/${id}/descargo`, req);
  }

  resolverPenalidad(id: number, req: PenalidadResolverRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.basePen}/${id}/resolver`, req);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private buildParams(q: object): HttpParams {
    let params = new HttpParams();
    for (const [key, val] of Object.entries(q)) {
      if (val !== undefined && val !== null) {
        params = params.set(key, String(val));
      }
    }
    return params;
  }
}
