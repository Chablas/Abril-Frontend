import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../../../salud-ocupacional/services/http-base';
import { ResiduoDocumentoReferenciaDto, ResiduoDocumentoReferenciaUpsertDto } from '../dtos/documento-referencia.dtos';

@Injectable({ providedIn: 'root' })
export class DocumentoReferenciaService {
  private base = `${environment.apiUrl}api/v1/ssoma/gestion/residuos/documentos-referencia`;

  constructor(private http: HttpClient) {}

  getAll(tipo?: string, activo?: boolean): Observable<ResiduoDocumentoReferenciaDto[]> {
    const params = buildParams({ tipo, activo });
    return this.http.get<ResiduoDocumentoReferenciaDto[]>(this.base, { params, headers: buildAuthHeaders() });
  }

  getById(id: number): Observable<ResiduoDocumentoReferenciaDto> {
    return this.http.get<ResiduoDocumentoReferenciaDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: ResiduoDocumentoReferenciaUpsertDto, archivo: File): Observable<{ id: number }> {
    const fd = new FormData();
    fd.append('tipo', dto.tipo);
    fd.append('nombre', dto.nombre);
    if (dto.descripcion != null) fd.append('descripcion', dto.descripcion);
    if (dto.version != null) fd.append('version', dto.version);
    fd.append('activo', String(dto.activo));
    fd.append('archivo', archivo);
    return this.http.post<{ id: number }>(this.base, fd, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: ResiduoDocumentoReferenciaUpsertDto): Observable<{ message: string }> {
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
