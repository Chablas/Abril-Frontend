import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ProyectoSimpleDto,
  ActividadesProyectoResponseDto,
  ActividadDto,
  CascadaResultDto,
  ActualizarPredecesorasResultDto,
  CrearActividadRequest,
  CrearActividadResultDto,
  ReordenarItem,
  EditarActividadRequest,
  EditarActividadResultDto,
} from '../dtos/cronograma-actividades.dtos';

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

  getActividades(proyectoId: number): Observable<ActividadesProyectoResponseDto> {
    return this.http.get<ActividadesProyectoResponseDto>(`${this.base}/${proyectoId}/actividades`, {
      headers: buildAuthHeaders(),
    });
  }

  crearActividad(proyectoId: number, body: CrearActividadRequest): Observable<CrearActividadResultDto> {
    return this.http.post<CrearActividadResultDto>(`${this.base}/${proyectoId}/actividades`, body, {
      headers: buildAuthHeaders(),
    });
  }

  editarActividad(id: number, body: EditarActividadRequest): Observable<EditarActividadResultDto> {
    return this.http.put<EditarActividadResultDto>(`${this.base}/actividades/${id}`, body, {
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

  actualizarPredecesoras(id: number, body: { predecessorIds: number[] }): Observable<ActualizarPredecesorasResultDto> {
    return this.http.put<ActualizarPredecesorasResultDto>(
      `${this.base}/actividades/${id}/predecesoras`,
      body,
      { headers: buildAuthHeaders() },
    );
  }

  previewCascada(proyectoId: number): Observable<CascadaResultDto> {
    return this.http.post<CascadaResultDto>(
      `${this.base}/${proyectoId}/recalcular-cascada/preview`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  aplicarCascada(proyectoId: number): Observable<CascadaResultDto> {
    return this.http.post<CascadaResultDto>(
      `${this.base}/${proyectoId}/recalcular-cascada/aplicar`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  actualizarLineaBase(
    id: number,
    body: { baselineStartDate: string | null; baselineEndDate: string | null },
  ): Observable<void> {
    return this.http.patch<void>(`${this.base}/actividades/${id}/linea-base`, body, {
      headers: buildAuthHeaders(),
    });
  }

  importarMpp(proyectoId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', file);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
    return this.http.post(`${this.base}/${proyectoId}/importar-mpp`, formData, { headers });
  }
}
