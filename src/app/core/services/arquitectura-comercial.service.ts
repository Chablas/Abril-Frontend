import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ArqComercialDashboardDTO,
  ArqComercialFiltersDTO,
  ArqComercialSelectedFilters,
} from '../dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model';
import {
  ProyectoConActividadesDTO,
  SupervisorAcDTO,
  ActividadListItemDTO,
  ActividadListResponseDTO,
  ActividadesQueryParams,
  ActividadPatchBody,
  ReasignarEncargadoResultDTO,
  GenerarActividadesResultDTO,
  PatchProyectoBody,
  GanttActividadDTO,
  GanttQueryParams,
} from '../dtos/arquitectura-comercial/actividades.model';

@Injectable({ providedIn: 'root' })
export class ArquitecturaComercialService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getDashboardData(filters: ArqComercialSelectedFilters): Observable<ArqComercialDashboardDTO> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const value = (filters as any)[key];
      if (value !== null && value !== '' && value !== undefined && value !== 0) {
        params = params.set(key, value);
      }
    });
    return this.http.get<ArqComercialDashboardDTO>(`${this.apiUrl}/dashboard`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getFilters(): Observable<ArqComercialFiltersDTO> {
    return this.http.get<ArqComercialFiltersDTO>(`${this.apiUrl}/filters`, {
      headers: this.authHeaders(),
    });
  }

  getProyectosConActividades(): Observable<ProyectoConActividadesDTO[]> {
    return this.http.get<ProyectoConActividadesDTO[]>(`${this.apiUrl}/proyectos-con-actividades`, {
      headers: this.authHeaders(),
    });
  }

  getSupervisoresAc(): Observable<SupervisorAcDTO[]> {
    return this.http.get<SupervisorAcDTO[]>(`${this.apiUrl}/supervisores-ac`, {
      headers: this.authHeaders(),
    });
  }

  getActividades(q: ActividadesQueryParams): Observable<ActividadListResponseDTO> {
    let params = new HttpParams();
    if (q.proyectoId != null) params = params.set('proyectoId', q.proyectoId);
    if (q.tipo) params = params.set('tipo', q.tipo);
    if (q.etapaId != null) params = params.set('etapaId', q.etapaId);
    if (q.search) params = params.set('search', q.search);
    if (q.soloActivas != null) params = params.set('soloActivas', q.soloActivas);
    if (q.pagina != null) params = params.set('pagina', q.pagina);
    if (q.porPagina != null) params = params.set('porPagina', q.porPagina);
    return this.http.get<ActividadListResponseDTO>(`${this.apiUrl}/actividades`, {
      params,
      headers: this.authHeaders(),
    });
  }

  patchActividad(id: number, body: ActividadPatchBody): Observable<ActividadListItemDTO> {
    return this.http.patch<ActividadListItemDTO>(`${this.apiUrl}/actividades/${id}`, body, {
      headers: this.authHeaders(),
    });
  }

  reasignarEncargado(proyectoId: number): Observable<ReasignarEncargadoResultDTO> {
    return this.http.post<ReasignarEncargadoResultDTO>(
      `${this.apiUrl}/actividades/reasignar-encargado`,
      { proyectoId },
      { headers: this.authHeaders() },
    );
  }

  generarActividades(proyectoId: number): Observable<GenerarActividadesResultDTO> {
    return this.http.post<GenerarActividadesResultDTO>(
      `${this.apiUrl}/actividades/generar`,
      { proyectoId },
      { headers: this.authHeaders() },
    );
  }

  patchProyecto(id: number, body: PatchProyectoBody): Observable<ProyectoConActividadesDTO> {
    return this.http.patch<ProyectoConActividadesDTO>(`${this.apiUrl}/proyectos/${id}`, body, {
      headers: this.authHeaders(),
    });
  }

  getGantt(q: GanttQueryParams): Observable<GanttActividadDTO[]> {
    let params = new HttpParams();
    if (q.proyectoId != null) params = params.set('proyectoId', q.proyectoId);
    if (q.tipo) params = params.set('tipo', q.tipo);
    if (q.etapa) params = params.set('etapa', q.etapa);
    if (q.soloActivas != null) params = params.set('soloActivas', q.soloActivas);
    return this.http.get<GanttActividadDTO[]>(`${this.apiUrl}/gantt`, {
      params,
      headers: this.authHeaders(),
    });
  }
}
