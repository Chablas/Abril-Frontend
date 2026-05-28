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

  createEmo(
    dto: EmoCreateDto,
    documentoInterconsulta?: File | null,
  ): Observable<{ id: number; message: string; interconsultaId?: number }> {
    if (documentoInterconsulta) {
      const fd = new FormData();
      fd.append('workerId', dto.workerId.toString());
      fd.append('tipoEmoId', dto.tipoEmoId.toString());
      if (dto.empresaOrigenId != null) fd.append('empresaOrigenId', dto.empresaOrigenId.toString());
      fd.append('fechaEmo', dto.fechaEmo);
      fd.append('aptitud', dto.aptitud);
      fd.append('requiereInterconsulta', dto.requiereInterconsulta ? 'true' : 'false');
      if (dto.notas)       fd.append('notas', dto.notas);
      if (dto.fechaLectura) fd.append('fechaLectura', dto.fechaLectura);
      if (dto.restricciones?.length) fd.append('restricciones', JSON.stringify(dto.restricciones));
      if (dto.interconsultaInline)   fd.append('interconsultaInline', JSON.stringify(dto.interconsultaInline));
      fd.append('documentoInterconsulta', documentoInterconsulta, documentoInterconsulta.name);
      return this.http.post<{ id: number; message: string; interconsultaId?: number }>(
        this.apiUrl, fd, { headers: buildAuthHeaders() },
      );
    }
    return this.http.post<{ id: number; message: string; interconsultaId?: number }>(
      this.apiUrl, dto, { headers: buildAuthHeaders() },
    );
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
