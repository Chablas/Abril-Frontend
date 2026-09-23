import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../../salud-ocupacional/services/http-base';
import {
  DeclaracionResiduoDto,
  DeclaracionResiduoUpsertRequest,
  DeclaracionResiduoDetalleUpsertRequest,
  DeclaracionResiduoEoRsUpsertRequest,
  DeclaracionResiduoMarcarPresentadaRequest,
  DeclaracionResiduoRecalcularRequest,
} from '../dtos/declaracion-residuo.dtos';

@Injectable({ providedIn: 'root' })
export class DeclaracionResiduoService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/declaraciones`;

  constructor(private http: HttpClient) {}

  getAll(contributorId?: number, periodoAnio?: number): Observable<DeclaracionResiduoDto[]> {
    let params = new HttpParams();
    if (contributorId) params = params.set('contributorId', contributorId);
    if (periodoAnio) params = params.set('periodoAnio', periodoAnio);
    return this.http.get<DeclaracionResiduoDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<DeclaracionResiduoDto> {
    return this.http.get<DeclaracionResiduoDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(req: DeclaracionResiduoUpsertRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, req, { headers: buildAuthHeaders() });
  }

  recalcular(req: DeclaracionResiduoRecalcularRequest): Observable<DeclaracionResiduoDto> {
    return this.http.post<DeclaracionResiduoDto>(`${this.base}/recalcular`, req, { headers: buildAuthHeaders() });
  }

  upsertDetalle(declaracionId: number, req: DeclaracionResiduoDetalleUpsertRequest): Observable<{ id: number }> {
    return this.http.put<{ id: number }>(`${this.base}/${declaracionId}/detalles`, req, { headers: buildAuthHeaders() });
  }

  eliminarDetalle(detalleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/detalles/${detalleId}`, { headers: buildAuthHeaders() });
  }

  marcarPresentada(id: number, req: DeclaracionResiduoMarcarPresentadaRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/presentar`, req, { headers: buildAuthHeaders() });
  }

  volverABorrador(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/reabrir`, {}, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  crearEoRsInterviniente(declaracionId: number, req: DeclaracionResiduoEoRsUpsertRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${declaracionId}/eo-rs`, req, { headers: buildAuthHeaders() });
  }

  actualizarEoRsInterviniente(itemId: number, req: DeclaracionResiduoEoRsUpsertRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/eo-rs/${itemId}`, req, { headers: buildAuthHeaders() });
  }

  eliminarEoRsInterviniente(itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/eo-rs/${itemId}`, { headers: buildAuthHeaders() });
  }
}
