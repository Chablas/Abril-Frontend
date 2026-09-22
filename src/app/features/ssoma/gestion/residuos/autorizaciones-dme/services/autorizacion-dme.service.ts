import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import { ResiduoAutorizacionDmeDto, ResiduoAutorizacionDmeUpsertDto } from '../dtos/autorizacion-dme.dtos';

@Injectable({ providedIn: 'root' })
export class AutorizacionDmeService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/autorizaciones-dme`;

  constructor(private http: HttpClient) {}

  getAll(projectId?: number, estado?: string): Observable<ResiduoAutorizacionDmeDto[]> {
    const params = buildParams({ projectId, estado });
    return this.http.get<ResiduoAutorizacionDmeDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoAutorizacionDmeDto> {
    return this.http.get<ResiduoAutorizacionDmeDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoAutorizacionDmeUpsertDto, archivo?: File | null): Observable<{ id: number }> {
    const fd = new FormData();
    fd.append('projectId', String(dto.projectId));
    fd.append('municipalidad', dto.municipalidad);
    fd.append('numeroResolucion', dto.numeroResolucion);
    if (dto.escombreraDestinoId != null) fd.append('escombreraDestinoId', String(dto.escombreraDestinoId));
    fd.append('vigenciaDesde', dto.vigenciaDesde);
    fd.append('vigenciaHasta', dto.vigenciaHasta);
    if (dto.placasAutorizadas != null) fd.append('placasAutorizadas', dto.placasAutorizadas);
    fd.append('estado', dto.estado);
    if (archivo) fd.append('archivo', archivo);
    return this.http.post<{ id: number }>(this.base, fd, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoAutorizacionDmeUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  subirArchivo(id: number, archivo: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<{ url: string }>(`${this.base}/${id}/archivo`, fd, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }
}
