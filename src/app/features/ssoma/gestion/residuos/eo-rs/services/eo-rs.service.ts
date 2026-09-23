import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import {
  ResiduoEoRsDto,
  ResiduoEoRsUpsertDto,
  ResiduoEoRsDocumentoDto,
  ResiduoEoRsDocumentoUpsertDto,
} from '../dtos/eo-rs.dtos';

@Injectable({ providedIn: 'root' })
export class EoRsService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/eo-rs`;

  constructor(private http: HttpClient) {}

  getAll(activo?: boolean, tipoOperador?: string): Observable<ResiduoEoRsDto[]> {
    const params = buildParams({ activo, tipoOperador });
    return this.http.get<ResiduoEoRsDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoEoRsDto> {
    return this.http.get<ResiduoEoRsDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoEoRsUpsertDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, dto, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoEoRsUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  getDocumentos(eoRsId: number): Observable<ResiduoEoRsDocumentoDto[]> {
    return this.http.get<ResiduoEoRsDocumentoDto[]>(`${this.base}/${eoRsId}/documentos`, {
      headers: buildAuthHeaders(),
    });
  }

  createDocumento(
    eoRsId: number,
    dto: ResiduoEoRsDocumentoUpsertDto,
    archivo?: File | null,
  ): Observable<{ id: number }> {
    const fd = new FormData();
    fd.append('tipoDocumento', dto.tipoDocumento);
    if (dto.numero != null) fd.append('numero', dto.numero);
    if (dto.vigenciaDesde != null) fd.append('vigenciaDesde', dto.vigenciaDesde);
    if (dto.vigenciaHasta != null) fd.append('vigenciaHasta', dto.vigenciaHasta);
    fd.append('cumple', String(dto.cumple));
    if (archivo) fd.append('archivo', archivo);
    return this.http.post<{ id: number }>(`${this.base}/${eoRsId}/documentos`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  updateDocumento(documentoId: number, dto: ResiduoEoRsDocumentoUpsertDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/documentos/${documentoId}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  subirArchivoDocumento(documentoId: number, archivo: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return this.http.post<{ url: string }>(`${this.base}/documentos/${documentoId}/archivo`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  deleteDocumento(documentoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/documentos/${documentoId}`, {
      headers: buildAuthHeaders(),
    });
  }
}
