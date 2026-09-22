import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import { ResiduoConstanciaFinalDto, ResiduoConstanciaFinalUpsertDto } from '../dtos/constancia-final-residuo.dtos';

@Injectable({ providedIn: 'root' })
export class ConstanciaFinalResiduoService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/constancias-finales`;

  constructor(private http: HttpClient) {}

  getAll(projectId?: number): Observable<ResiduoConstanciaFinalDto[]> {
    const params = buildParams({ projectId });
    return this.http.get<ResiduoConstanciaFinalDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoConstanciaFinalDto> {
    return this.http.get<ResiduoConstanciaFinalDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoConstanciaFinalUpsertDto, archivo: File): Observable<{ id: number }> {
    const fd = new FormData();
    fd.append('projectId', String(dto.projectId));
    fd.append('fechaEmision', dto.fechaEmision);
    if (dto.observaciones != null) fd.append('observaciones', dto.observaciones);
    fd.append('archivo', archivo);
    return this.http.post<{ id: number }>(this.base, fd, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoConstanciaFinalUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }
}
