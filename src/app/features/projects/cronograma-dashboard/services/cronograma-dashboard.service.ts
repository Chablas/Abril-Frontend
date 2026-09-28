import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CronogramaDashboardResponseDto,
  ProjectsDashboardOverviewDto,
  ProyectoDetalleDto,
} from '../dtos/cronograma-dashboard.dtos';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class CronogramaDashboardService {
  private readonly base = `${environment.apiUrl}api/v1/cronograma-actividades`;
  /**
   * Ranking/Heatmap (Fase 1 de la consolidación con Dashboard de Proyectos) y el detalle de Gantt
   * siguen viviendo en el endpoint del feature `ProjectsDashboard` del backend — no se duplicó esa
   * lógica ahí, se pega directo en vez de depender de `ProjectsDashboardService` (que vive dentro
   * de `projects-dashboard/`, carpeta que la Fase 2 de este trabajo elimina por completo).
   */
  private readonly projectsDashboardBase = `${environment.apiUrl}api/v1/projects-dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(filters: {
    responsableId?: number;
    estado?: string;
  }): Observable<CronogramaDashboardResponseDto> {
    const qp: { [key: string]: string | number } = {};
    if (filters.responsableId != null) qp['responsableId'] = filters.responsableId;
    if (filters.estado) qp['estado'] = filters.estado;

    return this.http.get<CronogramaDashboardResponseDto>(`${this.base}/dashboard`, {
      headers: buildAuthHeaders(),
      params: qp,
    });
  }

  /** Ranking de responsables y heatmap de carga, sin filtrar — vista agregada de todos los proyectos. */
  getRankingYHeatmap(): Observable<ProjectsDashboardOverviewDto> {
    return this.http.get<ProjectsDashboardOverviewDto>(this.projectsDashboardBase, {
      headers: buildAuthHeaders(),
    });
  }

  getProyectoDetalle(proyectoId: number): Observable<ProyectoDetalleDto> {
    return this.http.get<ProyectoDetalleDto>(`${this.projectsDashboardBase}/${proyectoId}`, {
      headers: buildAuthHeaders(),
    });
  }
}
