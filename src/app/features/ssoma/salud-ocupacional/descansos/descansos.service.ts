import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { DescansoMedicoListItemDto, DescansoFilterDto } from './descansos.dtos';

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
export class DescansosService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/descansos`;

  constructor(private http: HttpClient) {}

  getList(filtros: DescansoFilterDto = {}): Observable<PagedResponseDTO<DescansoMedicoListItemDto>> {
    return this.http.get<PagedResponseDTO<DescansoMedicoListItemDto>>(this.base, {
      params: toParams(filtros as Record<string, unknown>),
      headers: authHeaders(),
    });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, {
      headers: authHeaders(),
    });
  }
}
