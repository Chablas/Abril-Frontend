import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import {
  PropietarioCreateDto,
  PropietarioGuardadoDto,
  PropietarioListItemDto,
  PropietarioPersonaDto,
  PropietariosInitDto,
  PropietarioUpdateDto,
} from '../dtos/propietario.dto';
import { PropietarioDocumentoNuevoDto, PropietarioDocumentosDto } from '../dtos/propietario-documento.dto';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class GestionPropietariosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/propietarios`;

  constructor(private http: HttpClient) {}

  /**
   * Carga inicial de la pantalla: proyectos (filtro y formulario) + primera página, en una sola
   * petición. Búsqueda, filtro y paginación van a `getPaged`, que ya no trae los proyectos.
   */
  getInit(pageSize: number): Observable<PropietariosInitDto> {
    return this.http.get<PropietariosInitDto>(`${this.apiUrl}/init?pageSize=${pageSize}`, {
      headers: buildAuthHeaders(),
    });
  }

  getPaged(
    page: number,
    pageSize: number,
    search: string,
    projectId: number | null,
  ): Observable<PagedResponseDTO<PropietarioListItemDto>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    if (projectId != null) params.set('projectId', String(projectId));
    return this.http.get<PagedResponseDTO<PropietarioListItemDto>>(
      `${this.apiUrl}/paged?${params.toString()}`,
      { headers: buildAuthHeaders() },
    );
  }

  buscarPersona(dni: string): Observable<PropietarioPersonaDto> {
    return this.http.get<PropietarioPersonaDto>(
      `${this.apiUrl}/persona?dni=${encodeURIComponent(dni)}`,
      { headers: buildAuthHeaders() },
    );
  }

  crear(dto: PropietarioCreateDto): Observable<PropietarioGuardadoDto> {
    return this.http.post<PropietarioGuardadoDto>(this.apiUrl, dto, { headers: buildAuthHeaders() });
  }

  actualizar(personId: number, dto: PropietarioUpdateDto): Observable<PropietarioGuardadoDto> {
    return this.http.put<PropietarioGuardadoDto>(`${this.apiUrl}/${personId}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  reenviarInvitacion(personId: number): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(`${this.apiUrl}/${personId}/reenviar-invitacion`, {}, {
      headers: buildAuthHeaders(),
    });
  }

  eliminar(personId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${personId}`, { headers: buildAuthHeaders() });
  }

  // ── Documentos (modal «Documentos») ─────────────────────────────────────

  getDocumentos(personId: number): Observable<PropietarioDocumentosDto> {
    return this.http.get<PropietarioDocumentosDto>(`${this.apiUrl}/${personId}/documentos`, {
      headers: buildAuthHeaders(),
    });
  }

  /**
   * El Guardar del modal: todos los documentos nuevos en una sola petición (`data` + `archivos`, en
   * el mismo orden). Devuelve el modal repintado.
   */
  guardarDocumentos(
    personId: number,
    nuevos: PropietarioDocumentoNuevoDto[],
    archivos: File[],
  ): Observable<PropietarioDocumentosDto> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(nuevos));
    archivos.forEach((archivo) => formData.append('archivos', archivo, archivo.name));
    return this.http.post<PropietarioDocumentosDto>(`${this.apiUrl}/${personId}/documentos`, formData, {
      headers: buildAuthHeaders(),
    });
  }

  /** Devuelve el modal repintado. */
  eliminarDocumento(personId: number, documentoId: number): Observable<PropietarioDocumentosDto> {
    return this.http.delete<PropietarioDocumentosDto>(`${this.apiUrl}/${personId}/documentos/${documentoId}`, {
      headers: buildAuthHeaders(),
    });
  }

  descargarDocumento(personId: number, documentoId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${personId}/documentos/${documentoId}/archivo`, {
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }
}
