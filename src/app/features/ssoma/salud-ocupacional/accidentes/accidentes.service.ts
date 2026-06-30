import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { AccidenteTrabajoListItemDto, AccidenteFilterDto, AccidenteTrabajoDetalleDto } from './accidentes.dtos';

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toParams(obj: Record<string, unknown>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class AccidentesService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/accidentes`;

  constructor(private http: HttpClient) {}

  getList(filtros: AccidenteFilterDto = {}): Observable<PagedResponseDTO<AccidenteTrabajoListItemDto>> {
    return this.http.get<PagedResponseDTO<AccidenteTrabajoListItemDto>>(this.base, {
      params: toParams(filtros as Record<string, unknown>),
      headers: authHeaders(),
    });
  }

  getDetalle(id: number): Observable<AccidenteTrabajoDetalleDto> {
    return this.http.get<AccidenteTrabajoDetalleDto>(`${this.base}/${id}`, {
      headers: authHeaders(),
    });
  }

  marcarReinduccion(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/reinduccion`, {}, {
      headers: authHeaders(),
    });
  }

  cerrar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/cerrar`, {}, {
      headers: authHeaders(),
    });
  }
}
