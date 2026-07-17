import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from '../services/http-base';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import {
  RevisionDescansoDetalleDto,
  RevisionDescansoListItemDto,
  RevisionDescansosFiltro,
  RevisionDescansosInitDto,
} from './revision-descansos.dtos';

@Injectable({ providedIn: 'root' })
export class RevisionDescansosService {
  private readonly base = `${SALUD_OCUPACIONAL_BASE}/revision-descansos`;

  constructor(private http: HttpClient) {}

  private buildFilterParams(
    filtro: RevisionDescansosFiltro,
    page: number,
    sortBy: string | null,
    sortDir: 'asc' | 'desc' | null,
    areaScopeIds: number[] | null,
  ): HttpParams {
    let params = new HttpParams().set('page', page);
    if (filtro.workerId != null) params = params.set('workerId', filtro.workerId);
    if (filtro.estado)           params = params.set('estado', filtro.estado);
    if (filtro.fechaDesde)       params = params.set('fechaDesde', filtro.fechaDesde);
    if (filtro.fechaHasta)       params = params.set('fechaHasta', filtro.fechaHasta);
    if (sortBy)                  params = params.set('sortBy', sortBy);
    if (sortDir)                 params = params.set('sortDir', sortDir);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    return params;
  }

  /** Carga inicial: árbol de áreas + trabajadores + primera página, en una sola petición. */
  getInit(
    filtro: RevisionDescansosFiltro,
    page = 1,
    sortBy: string | null = null,
    sortDir: 'asc' | 'desc' | null = null,
    areaScopeIds: number[] | null = null,
  ): Observable<RevisionDescansosInitDto> {
    return this.http.get<RevisionDescansosInitDto>(`${this.base}/init`, {
      headers: buildAuthHeaders(),
      params: this.buildFilterParams(filtro, page, sortBy, sortDir, areaScopeIds),
    });
  }

  /** Solo la tabla filtrada/ordenada/paginada (los filtros ya están cargados). */
  getList(
    filtro: RevisionDescansosFiltro,
    page = 1,
    sortBy: string | null = null,
    sortDir: 'asc' | 'desc' | null = null,
    areaScopeIds: number[] | null = null,
  ): Observable<PagedResponseDTO<RevisionDescansoListItemDto>> {
    return this.http.get<PagedResponseDTO<RevisionDescansoListItemDto>>(this.base, {
      headers: buildAuthHeaders(),
      params: this.buildFilterParams(filtro, page, sortBy, sortDir, areaScopeIds),
    });
  }

  getDetalle(id: number): Observable<RevisionDescansoDetalleDto> {
    return this.http.get<RevisionDescansoDetalleDto>(`${this.base}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  /** Aprueba en bloque (sirve también para una sola solicitud). */
  aprobar(ids: number[]): Observable<{ count: number; message: string }> {
    return this.http.post<{ count: number; message: string }>(`${this.base}/aprobar`, { ids }, {
      headers: buildAuthHeaders(),
    });
  }

  /** Rechaza en bloque con un motivo común. */
  rechazar(ids: number[], motivoRechazo: string): Observable<{ count: number; message: string }> {
    return this.http.post<{ count: number; message: string }>(`${this.base}/rechazar`, { ids, motivoRechazo }, {
      headers: buildAuthHeaders(),
    });
  }
}
