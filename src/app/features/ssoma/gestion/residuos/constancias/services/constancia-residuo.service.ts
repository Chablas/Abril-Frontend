import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import { ResiduoConstanciaDto, ResiduoConstanciaUpsertDto } from '../dtos/constancia-residuo.dtos';

@Injectable({ providedIn: 'root' })
export class ConstanciaResiduoService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/constancias`;

  constructor(private http: HttpClient) {}

  getAll(projectId?: number, periodoAnio?: number, periodoMes?: number): Observable<ResiduoConstanciaDto[]> {
    const params = buildParams({ projectId, periodoAnio, periodoMes });
    return this.http.get<ResiduoConstanciaDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoConstanciaDto> {
    return this.http.get<ResiduoConstanciaDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoConstanciaUpsertDto, archivo: File): Observable<{ id: number }> {
    const fd = new FormData();
    fd.append('projectId', String(dto.projectId));
    if (dto.eoRsId != null) fd.append('eoRsId', String(dto.eoRsId));
    if (dto.contratista != null) fd.append('contratista', dto.contratista);
    if (dto.destino != null) fd.append('destino', dto.destino);
    fd.append('periodoAnio', String(dto.periodoAnio));
    fd.append('periodoMes', String(dto.periodoMes));
    if (dto.numeroCertificado != null) fd.append('numeroCertificado', dto.numeroCertificado);
    fd.append('archivo', archivo);
    return this.http.post<{ id: number }>(this.base, fd, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoConstanciaUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }
}
