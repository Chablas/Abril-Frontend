import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  AreaAsignacionInicialDTO,
  AreaAsignacionUpdateDTO,
  AreaFiltroProyectoUpdateDTO,
  AsignacionAreaModo,
} from '../dtos/asignacion-area.dto';

/**
 * Asignaciones de personas por área. Todas las operaciones reciben el `modo` porque hay dos
 * pantallas con el mismo contrato —Revisores de Áreas y Consolidadores de Áreas— y cada una tiene
 * su propio endpoint.
 */
@Injectable({ providedIn: 'root' })
export class AsignacionesAreasService {
  private static readonly SEGMENTO: Record<AsignacionAreaModo, string> = {
    revisores: 'revisores-areas',
    consolidadores: 'consolidadores-areas',
  };

  constructor(private http: HttpClient) {}

  private base(modo: AsignacionAreaModo): string {
    return `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/${AsignacionesAreasService.SEGMENTO[modo]}`;
  }

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: áreas con sus asignados + opciones del selector (1 petición). */
  getInitialData(modo: AsignacionAreaModo): Observable<AreaAsignacionInicialDTO> {
    return this.http.get<AreaAsignacionInicialDTO>(this.base(modo), { headers: this.headers });
  }

  /** Reemplaza el conjunto completo del área (o del proyecto si dto.projectId != null). */
  update(
    modo: AsignacionAreaModo,
    areaScopeId: number,
    dto: AreaAsignacionUpdateDTO,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base(modo)}/${areaScopeId}`, dto, {
      headers: this.headers,
    });
  }

  /** Marca/desmarca "filtrar por proyecto" para el área (la bandera es del área, no del modo). */
  setFiltroProyecto(
    modo: AsignacionAreaModo,
    areaScopeId: number,
    dto: AreaFiltroProyectoUpdateDTO,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(modo)}/${areaScopeId}/filtro-proyecto`,
      dto,
      { headers: this.headers },
    );
  }
}
