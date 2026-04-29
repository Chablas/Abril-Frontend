import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders, buildParams } from './http-base';
import {
  EmoCreateDto,
  EmoDetalleDto,
  EmoListItemDto,
  EmoPorTrabajadorDto,
  EmoPorTrabajadorQuery,
  EmoQueryParams,
  WorkerEmoHistorialDto,
} from '../dtos/emo.model';

@Injectable({ providedIn: 'root' })
export class EmoService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/emos`;
  private readonly workersUrl = `${SALUD_OCUPACIONAL_BASE}/workers`;

  constructor(private http: HttpClient) {}

  getEmos(query: EmoQueryParams = {}): Observable<PagedResponseDTO<EmoListItemDto>> {
    return this.http.get<PagedResponseDTO<EmoListItemDto>>(this.apiUrl, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getEmosPorTrabajador(query: EmoPorTrabajadorQuery = {}): Observable<PagedResponseDTO<EmoPorTrabajadorDto>> {
    return this.http.get<PagedResponseDTO<EmoPorTrabajadorDto>>(`${this.apiUrl}/por-trabajador`, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getEmoDetalle(id: number): Observable<EmoDetalleDto> {
    return this.http.get<EmoDetalleDto>(`${this.apiUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  getHistorialWorker(workerId: number): Observable<WorkerEmoHistorialDto> {
    return this.http.get<WorkerEmoHistorialDto>(`${this.workersUrl}/${workerId}/historial-emo`, {
      headers: buildAuthHeaders(),
    });
  }

  createEmo(dto: EmoCreateDto): Observable<EmoDetalleDto> {
    return this.http.post<EmoDetalleDto>(this.apiUrl, dto, {
      headers: buildAuthHeaders(),
    });
  }

  updateEmo(id: number, dto: Partial<EmoCreateDto>): Observable<EmoDetalleDto> {
    return this.http.put<EmoDetalleDto>(`${this.apiUrl}/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  patchEstadoEmo(id: number, estado: string): Observable<EmoDetalleDto> {
    return this.http.patch<EmoDetalleDto>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      { headers: buildAuthHeaders() },
    );
  }
}
