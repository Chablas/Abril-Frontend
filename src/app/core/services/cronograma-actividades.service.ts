import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  hierarchyLevel: number;
  parentId: number | null;
}

export interface CrearActividadRequest {
  activityDescription: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  progressPercentage: number;
  hierarchyLevel: number;
  parentId: number | null;
}

export interface ReordenarItem {
  projectActivityId: number;
  order: number;
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

  reordenarActividades(proyectoId: number, items: ReordenarItem[]): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${proyectoId}/actividades/reordenar`,
      items,
      { headers: buildAuthHeaders() },
    );
  }

  subirNivel(proyectoId: number, id: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${proyectoId}/actividades/${id}/subir-nivel`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  bajarNivel(proyectoId: number, id: number, parentId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${proyectoId}/actividades/${id}/bajar-nivel`,
      { parentId },
      { headers: buildAuthHeaders() },
    );
  }

  importarMpp(proyectoId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', file);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
    return this.http.post(`${this.base}/${proyectoId}/importar-mpp`, formData, { headers });
  }
}
