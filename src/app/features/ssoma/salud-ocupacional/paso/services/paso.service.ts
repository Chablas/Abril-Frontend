import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../services/http-base';
import {
  PasoDto,
  PasoSpiDto,
  PasoDashboardDto,
  PasoAlertaDto,
  PasoGanttDto,
  PasoCategoriaDto,
  CreatePasoDto,
  InstanciarPasoDto,
} from '../dtos/paso.dtos';

const PASO_BASE = `${environment.apiUrl}api/v1/ssoma-paso`;

@Injectable({ providedIn: 'root' })
export class PasoService {
  constructor(private http: HttpClient) {}

  getAll(params: { proyectoId?: number; anio?: number; estado?: string; esPlantilla?: boolean } = {}): Observable<PasoDto[]> {
    return this.http.get<PasoDto[]>(PASO_BASE, {
      params: buildParams(params as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getById(id: number): Observable<PasoDto> {
    return this.http.get<PasoDto>(`${PASO_BASE}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: CreatePasoDto): Observable<PasoDto> {
    return this.http.post<PasoDto>(PASO_BASE, dto, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: Partial<CreatePasoDto>): Observable<PasoDto> {
    return this.http.put<PasoDto>(`${PASO_BASE}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  aprobar(id: number): Observable<PasoDto> {
    return this.http.patch<PasoDto>(`${PASO_BASE}/${id}/aprobar`, {}, { headers: buildAuthHeaders() });
  }

  instanciar(id: number, dto: InstanciarPasoDto): Observable<PasoDto> {
    return this.http.post<PasoDto>(`${PASO_BASE}/${id}/instanciar`, dto, { headers: buildAuthHeaders() });
  }

  getGantt(id: number): Observable<PasoGanttDto> {
    return this.http.get<PasoGanttDto>(`${PASO_BASE}/${id}/gantt`, { headers: buildAuthHeaders() });
  }

  getSpi(id: number): Observable<PasoSpiDto> {
    return this.http.get<PasoSpiDto>(`${PASO_BASE}/${id}/spi`, { headers: buildAuthHeaders() });
  }

  getDashboard(): Observable<PasoDashboardDto> {
    return this.http.get<PasoDashboardDto>(`${PASO_BASE}/dashboard`, { headers: buildAuthHeaders() });
  }

  getAlertas(): Observable<PasoAlertaDto[]> {
    return this.http.get<PasoAlertaDto[]>(`${PASO_BASE}/alertas`, { headers: buildAuthHeaders() });
  }

  getCategorias(): Observable<PasoCategoriaDto[]> {
    return this.http.get<PasoCategoriaDto[]>(`${PASO_BASE}/categorias`, { headers: buildAuthHeaders() });
  }

  exportReporte(id: number, format: 'excel' | 'pdf'): Observable<Blob> {
    return this.http.get(`${PASO_BASE}/${id}/reporte`, {
      params: buildParams({ format } as Record<string, unknown>),
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }
}
