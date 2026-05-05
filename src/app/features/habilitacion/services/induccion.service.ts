import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import { InduccionBatchCreateDto, InduccionCreateDto, InduccionDto, InduccionTrabajadorDto } from '../dtos/induccion.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class InduccionService {
  private readonly base = `${HABILITACION_BASE}/inducciones`;

  constructor(private http: HttpClient) {}

  getInducciones(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<InduccionDto>> {
    return this.http.get<PagedResponseDTO<InduccionDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  create(dto: InduccionCreateDto): Observable<InduccionDto> {
    return this.http.post<InduccionDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  patchEstado(id: number, estado: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${id}/estado`,
      { estado },
      { headers: buildHabHeaders() },
    );
  }

  getTrabajadoresPorProgramar(
    proyectoId: number,
    empresaId?: number | null,
  ): Observable<InduccionTrabajadorDto[]> {
    return this.http.get<InduccionTrabajadorDto[]>(`${this.base}/trabajadores-por-programar`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, empresaId }),
    });
  }

  crearBatch(dto: InduccionBatchCreateDto): Observable<InduccionDto[]> {
    return this.http.post<InduccionDto[]>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  aprobar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/aprobar`, {}, {
      headers: buildHabHeaders(),
    });
  }

  aprobarBatch(ids: number[]): Observable<void> {
    return this.http.post<void>(`${this.base}/aprobar-batch`, { ids }, {
      headers: buildHabHeaders(),
    });
  }
}
