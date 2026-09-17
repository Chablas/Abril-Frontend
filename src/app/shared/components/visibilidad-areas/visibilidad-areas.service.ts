import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  VisibilidadAsignacionDTO,
  VisibilidadInicialDTO,
  VisibilidadWorkerDetalleDTO,
} from './visibilidad-areas.dto';

/**
 * Override manual de "qué áreas ve este trabajador". Todas las operaciones reciben el `endpoint`
 * de la pantalla que se está configurando (la ruta del backend sin `apiUrl`, ej.
 * `api/v1/gestion-administrativa/configuracion/visibilidad/salidas`): cada pantalla tiene su propia
 * configuración y todas responden el mismo contrato.
 */
@Injectable({ providedIn: 'root' })
export class VisibilidadAreasService {
  constructor(private http: HttpClient) {}

  private url(endpoint: string): string {
    return `${environment.apiUrl}${endpoint}`;
  }

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getInitialData(endpoint: string): Observable<VisibilidadInicialDTO> {
    return this.http.get<VisibilidadInicialDTO>(this.url(endpoint), { headers: this.headers });
  }

  /**
   * Lo cargado a mano del trabajador y lo que realmente ve hoy. Los dos modales salen de esta sola
   * llamada; el árbol de áreas no se vuelve a pedir porque ya vino con la carga inicial de la
   * sección y se les pasa por input.
   */
  getWorkerDetalle(endpoint: string, workerId: number): Observable<VisibilidadWorkerDetalleDTO> {
    return this.http.get<VisibilidadWorkerDetalleDTO>(`${this.url(endpoint)}/worker/${workerId}`, {
      headers: this.headers,
    });
  }

  updateWorkerAsignaciones(
    endpoint: string,
    workerId: number,
    areas: VisibilidadAsignacionDTO[],
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.url(endpoint)}/worker/${workerId}`,
      { areas },
      { headers: this.headers },
    );
  }
}
