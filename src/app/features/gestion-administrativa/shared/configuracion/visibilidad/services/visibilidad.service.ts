import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  VisibilidadAmbito,
  VisibilidadAsignacionDTO,
  VisibilidadInicialDTO,
  VisibilidadWorkerDetalleDTO,
} from '../dtos/visibilidad.dto';

/**
 * Override manual de "qué áreas ve este trabajador". Todas las operaciones reciben el `ambito`
 * porque hay una configuración por pantalla —Gestión de Salidas, Gestión de Rendiciones y
 * Consolidados— y cada una se administra desde la Configuración de la suya.
 */
@Injectable({ providedIn: 'root' })
export class VisibilidadService {
  constructor(private http: HttpClient) {}

  private base(ambito: VisibilidadAmbito): string {
    return `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/visibilidad/${ambito}`;
  }

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getInitialData(ambito: VisibilidadAmbito): Observable<VisibilidadInicialDTO> {
    return this.http.get<VisibilidadInicialDTO>(this.base(ambito), { headers: this.headers });
  }

  /**
   * Lo cargado a mano del trabajador y lo que realmente ve hoy. Los dos modales salen de esta sola
   * llamada; el árbol de áreas no se vuelve a pedir porque ya vino con la carga inicial de la
   * sección y se les pasa por input.
   */
  getWorkerDetalle(
    ambito: VisibilidadAmbito,
    workerId: number,
  ): Observable<VisibilidadWorkerDetalleDTO> {
    return this.http.get<VisibilidadWorkerDetalleDTO>(`${this.base(ambito)}/worker/${workerId}`, {
      headers: this.headers,
    });
  }

  updateWorkerAsignaciones(
    ambito: VisibilidadAmbito,
    workerId: number,
    areas: VisibilidadAsignacionDTO[],
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(ambito)}/worker/${workerId}`,
      { areas },
      { headers: this.headers },
    );
  }
}
