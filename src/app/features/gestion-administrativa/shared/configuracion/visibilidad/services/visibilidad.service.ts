import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  VisibilidadAmbito,
  VisibilidadAreaNodeDTO,
  VisibilidadAsignacionDTO,
  VisibilidadInicialDTO,
} from '../dtos/visibilidad.dto';

/**
 * Override manual de "qué áreas ve este trabajador". Todas las operaciones reciben el `ambito`
 * porque hay una configuración por pantalla —Gestión de Salidas y Gestión de Rendiciones— y cada
 * una se administra desde la Configuración de la suya.
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

  getAreaTree(ambito: VisibilidadAmbito): Observable<VisibilidadAreaNodeDTO[]> {
    return this.http.get<VisibilidadAreaNodeDTO[]>(`${this.base(ambito)}/area-scope-tree`, {
      headers: this.headers,
    });
  }

  getWorkerAsignaciones(
    ambito: VisibilidadAmbito,
    workerId: number,
  ): Observable<VisibilidadAsignacionDTO[]> {
    return this.http.get<VisibilidadAsignacionDTO[]>(`${this.base(ambito)}/worker/${workerId}`, {
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
