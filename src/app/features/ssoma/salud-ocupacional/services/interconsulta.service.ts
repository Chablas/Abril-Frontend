import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders, buildParams } from './http-base';
import {
  InterconsultaDetalleDto,
  InterconsultaListDto,
  InterconsultaQueryParams,
  InterconsultaUpdateDto,
} from '../dtos/interconsulta.model';

@Injectable({ providedIn: 'root' })
export class InterconsultaService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/interconsultas`;

  constructor(private http: HttpClient) {}

  getInterconsultas(
    query: InterconsultaQueryParams = {},
  ): Observable<PagedResponseDTO<InterconsultaListDto>> {
    return this.http.get<PagedResponseDTO<InterconsultaListDto>>(this.apiUrl, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getInterconsulta(id: number): Observable<InterconsultaDetalleDto> {
    return this.http.get<InterconsultaDetalleDto>(`${this.apiUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  updateInterconsulta(
    id: number,
    dto: InterconsultaUpdateDto,
  ): Observable<InterconsultaDetalleDto> {
    return this.http.put<InterconsultaDetalleDto>(`${this.apiUrl}/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }
}
