import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProjectsDashboardDTO,
  ProjectsDashboardFiltersDTO,
} from '../dtos/projects-dashboard/projectsDashboard.model';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ProjectsDashboardParams {
  proyectoId?: number | null;
  estado?: string;
  responsableArqComId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProjectsDashboardService {
  private readonly base = `${environment.apiUrl}api/v1/projects-dashboard`;

  constructor(private http: HttpClient) {}

  getFilters(): Observable<ProjectsDashboardFiltersDTO> {
    return this.http.get<ProjectsDashboardFiltersDTO>(`${this.base}/filters`, {
      headers: buildAuthHeaders(),
    });
  }

  getDashboard(params: ProjectsDashboardParams): Observable<ProjectsDashboardDTO> {
    let httpParams = new HttpParams();
    if (params.proyectoId) httpParams = httpParams.set('proyectoId', String(params.proyectoId));
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    if (params.responsableArqComId)
      httpParams = httpParams.set('responsableArqComId', String(params.responsableArqComId));
    return this.http.get<ProjectsDashboardDTO>(this.base, {
      headers: buildAuthHeaders(),
      params: httpParams,
    });
  }
}
