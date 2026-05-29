import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProyectoSimpleDto {
  projectId: number;
  projectDescription: string;
  responsableUdp: string | null;
}

export interface ActividadDto {
  projectActivityId: number;
  projectId: number;
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  progressPercentage: number;
  order: number;
}

export interface CrearActividadRequest {
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  progressPercentage: number;
}

export interface EditarActividadRequest {
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  progressPercentage: number;
}

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class CronogramaActividadesService {
  private readonly base = `${environment.apiUrl}api/v1/cronograma-actividades`;

  constructor(private http: HttpClient) {}

  getProyectos(): Observable<ProyectoSimpleDto[]> {
    return this.http.get<ProyectoSimpleDto[]>(`${this.base}/proyectos`, {
      headers: buildAuthHeaders(),
    });
  }

  getActividades(proyectoId: number): Observable<ActividadDto[]> {
    return this.http.get<ActividadDto[]>(`${this.base}/${proyectoId}/actividades`, {
      headers: buildAuthHeaders(),
    });
  }

  crearActividad(proyectoId: number, body: CrearActividadRequest): Observable<ActividadDto> {
    return this.http.post<ActividadDto>(`${this.base}/${proyectoId}/actividades`, body, {
      headers: buildAuthHeaders(),
    });
  }

  editarActividad(id: number, body: EditarActividadRequest): Observable<ActividadDto> {
    return this.http.put<ActividadDto>(`${this.base}/actividades/${id}`, body, {
      headers: buildAuthHeaders(),
    });
  }

  culminarActividad(id: number): Observable<{ projectActivityId: number; actualEndDate: string | null }> {
    return this.http.patch<{ projectActivityId: number; actualEndDate: string | null }>(
      `${this.base}/actividades/${id}/culminar`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  eliminarActividad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/actividades/${id}`, {
      headers: buildAuthHeaders(),
    });
  }
}
