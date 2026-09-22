import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import {
  ResiduoViajeDto,
  ResiduoViajeListFiltro,
  ResiduoViajePagedDto,
  ResiduoViajeUpsertDto,
} from '../dtos/viaje-residuo.dtos';

@Injectable({ providedIn: 'root' })
export class ViajeResiduoService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/viajes`;

  constructor(private http: HttpClient) {}

  getAll(filtro: ResiduoViajeListFiltro = {}): Observable<ResiduoViajePagedDto> {
    const params = buildParams({ ...filtro });
    return this.http.get<ResiduoViajePagedDto>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoViajeDto> {
    return this.http.get<ResiduoViajeDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoViajeUpsertDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoViajeUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  subirArchivo(id: number, archivo: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<{ url: string }>(`${this.base}/${id}/archivo`, fd, { headers: buildAuthHeaders() });
  }
}
