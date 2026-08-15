import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CatalogoDTO,
  GuardarMisTemasRequest,
  PagedResultDTO,
  ReunionAcuerdoRequest,
  ReunionAgendaDTO,
  ReunionArchivoDTO,
  ReunionCreateRequest,
  ReunionDetalleDTO,
  ReunionFiltro,
  ReunionFolderDTO,
  ReunionListItemDTO,
  ReunionPaginaInicialDTO,
  ReunionReprogramarRequest,
  ReunionUpdateRequest,
  TemaConvocatoriaDTO,
  TemaConvocatoriaSaveRequest,
  TrabajadorAbrilDTO,
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
    if (filtro.areaScopeId != null) params = params.set('areaScopeId', filtro.areaScopeId);
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

  /** Catálogo de temas predefinidos, para la pantalla de configuración de convocatoria por tema. */
  getTemasCatalogo(): Observable<CatalogoDTO[]> {
    return this.http.get<CatalogoDTO[]>(`${this.apiUrl}/temas`, { headers: this.authHeaders() });
  }

  /** Da de alta un tema personalizado en el catálogo, para reutilizarlo como tema recurrente. */
  agregarTema(descripcion: string): Observable<CatalogoDTO> {
    return this.http.post<CatalogoDTO>(
      `${this.apiUrl}/temas`,
      { descripcion },
      { headers: this.authHeaders() },
    );
  }

  /** Convocatoria recurrente configurada para un tema (área + puestos habituales). */
  getConvocatoriaTema(reunionTemaId: number): Observable<TemaConvocatoriaDTO> {
    return this.http.get<TemaConvocatoriaDTO>(`${this.apiUrl}/temas/${reunionTemaId}/convocatoria`, {
      headers: this.authHeaders(),
    });
  }

  guardarConvocatoriaTema(reunionTemaId: number, request: TemaConvocatoriaSaveRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/temas/${reunionTemaId}/convocatoria`,
      request,
      { headers: this.authHeaders() },
    );
  }

  /** Catálogo de puestos, para el filtro de convocatoria masiva. */
  getPuestos(): Observable<CatalogoDTO[]> {
    return this.http.get<CatalogoDTO[]>(`${this.apiUrl}/puestos`, { headers: this.authHeaders() });
  }

  /** Puestos que realmente existen dentro de un área/gerencia (con descendencia); null = todos. */
  getPuestosPorArea(areaScopeId: number | null): Observable<CatalogoDTO[]> {
    let params = new HttpParams();
    if (areaScopeId != null) params = params.set('areaScopeId', areaScopeId);
    return this.http.get<CatalogoDTO[]>(`${this.apiUrl}/puestos-por-area`, {
      headers: this.authHeaders(),
      params,
    });
  }

  /**
   * Trabajadores que calzan con un área/gerencia (incluye descendencia en el árbol area_scope),
   * una lista de puestos marcados en un checklist, y/o el staff asignado a un proyecto (ss_contratista_usuario
   * con scope POR_PROYECTO). Los tres filtros son opcionales y se combinan con AND; null/vacío
   * = cualquiera. Para convocatoria masiva.
   */
  buscarTrabajadoresPorFiltro(
    areaScopeId: number | null,
    puestoIds: number[] | null,
    projectId: number | null = null,
  ): Observable<TrabajadorAbrilDTO[]> {
    let params = new HttpParams();
    if (areaScopeId != null) params = params.set('areaScopeId', areaScopeId);
    if (puestoIds && puestoIds.length > 0) {
      for (const id of puestoIds) params = params.append('puestoIds', id);
    }
    if (projectId != null) params = params.set('projectId', projectId);
    return this.http.get<TrabajadorAbrilDTO[]>(`${this.apiUrl}/trabajadores-por-filtro`, {
      headers: this.authHeaders(),
      params,
    });
  }

  // ── Agenda de reunión ───────────────────────────────────────────────────────
  getAgenda(reunionId: number): Observable<ReunionAgendaDTO> {
    return this.http.get<ReunionAgendaDTO>(`${this.apiUrl}/${reunionId}/agenda`, {
      headers: this.authHeaders(),
    });
  }

  guardarMisTemas(reunionId: number, request: GuardarMisTemasRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${reunionId}/agenda/mis-temas`, request, {
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
