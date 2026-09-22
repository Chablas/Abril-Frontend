import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import {
  ResiduoTipoDto,
  ResiduoTipoUpsertDto,
  ResiduoTipoFactorDto,
  ResiduoTipoFactorUpsertDto,
} from '../dtos/tipo-residuo.dtos';

@Injectable({ providedIn: 'root' })
export class TipoResiduoService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/tipos`;

  constructor(private http: HttpClient) {}

  getAll(activo?: boolean): Observable<ResiduoTipoDto[]> {
    const params = buildParams({ activo });
    return this.http.get<ResiduoTipoDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoTipoDto> {
    return this.http.get<ResiduoTipoDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoTipoUpsertDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoTipoUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  getFactores(tipoId: number): Observable<ResiduoTipoFactorDto[]> {
    return this.http.get<ResiduoTipoFactorDto[]>(`${this.base}/${tipoId}/factores`, {
      headers: buildAuthHeaders(),
    });
  }

  createFactor(tipoId: number, dto: ResiduoTipoFactorUpsertDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${tipoId}/factores`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  updateFactor(factorId: number, dto: ResiduoTipoFactorUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/factores/${factorId}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  deleteFactor(factorId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/factores/${factorId}`, {
      headers: buildAuthHeaders(),
    });
  }
}
