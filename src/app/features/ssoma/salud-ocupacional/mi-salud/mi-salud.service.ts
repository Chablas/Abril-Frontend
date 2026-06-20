import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../services/http-base';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { MiSaludResumenDto, MiDescansoDto, CrearMiDescansoDto } from './mi-salud.dtos';

@Injectable({ providedIn: 'root' })
export class MiSaludService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/mi-salud`;

  constructor(private http: HttpClient) {}

  getResumen(): Observable<MiSaludResumenDto> {
    return this.http.get<MiSaludResumenDto>(`${this.base}/resumen`, {
      headers: buildAuthHeaders(),
    });
  }

  getDescansos(page = 1): Observable<PagedResponseDTO<MiDescansoDto>> {
    return this.http.get<PagedResponseDTO<MiDescansoDto>>(`${this.base}/descansos`, {
      params: buildParams({ page } as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  createDescanso(dto: CrearMiDescansoDto, documento?: File | null): Observable<{ id: number; message: string }> {
    const fd = new FormData();
    fd.append('tipo', dto.tipo);
    fd.append('fechaInicio', dto.fechaInicio);
    fd.append('fechaFin', dto.fechaFin);
    if (dto.dias != null)          fd.append('dias', dto.dias.toString());
    if (dto.motivo)                fd.append('motivo', dto.motivo);
    if (dto.diagnostico)           fd.append('diagnostico', dto.diagnostico);
    if (dto.diagnosticoCie10)      fd.append('diagnosticoCie10', dto.diagnosticoCie10);
    if (documento)                 fd.append('documento', documento, documento.name);

    return this.http.post<{ id: number; message: string }>(`${this.base}/descansos`, fd, {
      headers: buildAuthHeaders(),
    });
  }
}
