import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PagedResultDTO,
  ReunionAcuerdoRequest,
  ReunionArchivoDTO,
  ReunionCreateRequest,
  ReunionDetalleDTO,
  ReunionFiltro,
  ReunionFolderDTO,
  ReunionListItemDTO,
  ReunionPaginaInicialDTO,
  ReunionReprogramarRequest,
  ReunionUpdateRequest,
} from '../dtos/actas-reunion.dto';

@Injectable({ providedIn: 'root' })
export class ActasReunionService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/actas-reunion`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private filtroParams(filtro: ReunionFiltro): HttpParams {
    let params = new HttpParams().set('page', filtro.page).set('pageSize', filtro.pageSize);
    if (filtro.projectId != null) params = params.set('projectId', filtro.projectId);
    if (filtro.reunionEstadoId != null) params = params.set('reunionEstadoId', filtro.reunionEstadoId);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    return params;
  }

  /** Carga inicial: filtros (proyectos, estados) + primera página de reuniones. */
  getPaginaInicial(filtro: ReunionFiltro): Observable<ReunionPaginaInicialDTO> {
    return this.http.get<ReunionPaginaInicialDTO>(`${this.apiUrl}/pagina-inicial`, {
      headers: this.authHeaders(),
      params: this.filtroParams(filtro),
    });
  }

  /** Solo la tabla filtrada/paginada (sin volver a traer filtros). */
  getReuniones(filtro: ReunionFiltro): Observable<PagedResultDTO<ReunionListItemDTO>> {
    return this.http.get<PagedResultDTO<ReunionListItemDTO>>(this.apiUrl, {
      headers: this.authHeaders(),
      params: this.filtroParams(filtro),
    });
  }

  getDetalle(reunionId: number): Observable<ReunionDetalleDTO> {
    return this.http.get<ReunionDetalleDTO>(`${this.apiUrl}/${reunionId}`, {
      headers: this.authHeaders(),
    });
  }

  create(request: ReunionCreateRequest): Observable<{ reunionId: number; message: string }> {
    return this.http.post<{ reunionId: number; message: string }>(this.apiUrl, request, {
      headers: this.authHeaders(),
    });
  }

  update(reunionId: number, request: ReunionUpdateRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${reunionId}`, request, {
      headers: this.authHeaders(),
    });
  }

  reprogramar(reunionId: number, request: ReunionReprogramarRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${reunionId}/reprogramar`, request, {
      headers: this.authHeaders(),
    });
  }

  cambiarEstado(reunionId: number, estado: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${reunionId}/estado`,
      { estado },
      { headers: this.authHeaders() },
    );
  }

  eliminar(reunionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${reunionId}`, {
      headers: this.authHeaders(),
    });
  }

  crearAcuerdo(
    reunionId: number,
    request: ReunionAcuerdoRequest,
  ): Observable<{ reunionAcuerdoId: number; message: string }> {
    return this.http.post<{ reunionAcuerdoId: number; message: string }>(
      `${this.apiUrl}/${reunionId}/acuerdos`,
      request,
      { headers: this.authHeaders() },
    );
  }

  actualizarAcuerdo(reunionAcuerdoId: number, request: ReunionAcuerdoRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/acuerdos/${reunionAcuerdoId}`, request, {
      headers: this.authHeaders(),
    });
  }

  eliminarAcuerdo(reunionAcuerdoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/acuerdos/${reunionAcuerdoId}`, {
      headers: this.authHeaders(),
    });
  }

  subirArchivos(
    reunionId: number,
    files: File[],
  ): Observable<{ archivos: ReunionArchivoDTO[]; message: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return this.http.post<{ archivos: ReunionArchivoDTO[]; message: string }>(
      `${this.apiUrl}/${reunionId}/archivos`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  eliminarArchivo(reunionArchivoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/archivos/${reunionArchivoId}`, {
      headers: this.authHeaders(),
    });
  }

  // ── Carpeta de SharePoint para adjuntos (singleton) ────────────────────────
  getCarpeta(): Observable<ReunionFolderDTO | null> {
    return this.http.get<ReunionFolderDTO | null>(`${this.apiUrl}/carpeta`, {
      headers: this.authHeaders(),
    });
  }

  saveCarpeta(linkUrl: string): Observable<ReunionFolderDTO> {
    return this.http.put<ReunionFolderDTO>(
      `${this.apiUrl}/carpeta`,
      { linkUrl },
      { headers: this.authHeaders() },
    );
  }
}
