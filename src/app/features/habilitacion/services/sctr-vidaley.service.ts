import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import { SctrVidaLeyCreateDto, SctrVidaLeyDto } from '../dtos/sctr.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class SctrVidaLeyService {
  private readonly base = `${HABILITACION_BASE}/sctr-vidaley`;

  constructor(private http: HttpClient) {}

  getList(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<SctrVidaLeyDto>> {
    return this.http.get<PagedResponseDTO<SctrVidaLeyDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getById(id: number): Observable<SctrVidaLeyDto> {
    return this.http.get<SctrVidaLeyDto>(`${this.base}/${id}`, {
      headers: buildHabHeaders(),
    });
  }

  create(dto: SctrVidaLeyCreateDto): Observable<SctrVidaLeyDto> {
    return this.http.post<SctrVidaLeyDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  aprobar(id: number, dto: any): Observable<SctrVidaLeyDto> {
    return this.http.patch<SctrVidaLeyDto>(`${this.base}/${id}/aprobar`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getProximosVencer(dias: number = 30): Observable<SctrVidaLeyDto[]> {
    return this.http.get<SctrVidaLeyDto[]>(
      `${this.base}/proximos-vencer`,
      { headers: buildHabHeaders(), params: buildHabParams({ dias }) },
    );
  }
}
