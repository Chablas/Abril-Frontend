import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../salud-ocupacional/services/http-base';
import {
  ActualizarDriversDto,
  ActualizarDriversResultDto,
  ActualizarLineaPresupuestoDto,
  AbrirSemanaDto,
  ControlSemanaDto,
  DashboardPresupuestoDto,
  DriverProyectoDto,
  GenerarPresupuestoDto,
  PresupuestoDetalleDto,
  PresupuestoResumenDto,
  RegistrarConsumoLineaDto,
} from '../dtos/presupuesto-materiales.dtos';

@Injectable({ providedIn: 'root' })
export class PresupuestoMaterialesService {
  private base = `${environment.apiUrl}api/v1/ssoma/presupuesto-materiales`;

  constructor(private http: HttpClient) {}

  // ── Drivers ───────────────────────────────────────────────────────

  getDrivers(): Observable<DriverProyectoDto[]> {
    return this.http.get<DriverProyectoDto[]>(`${this.base}/ratios/proyectos/drivers`, {
      headers: buildAuthHeaders(),
    });
  }

  actualizarDrivers(projectId: number, dto: ActualizarDriversDto): Observable<ActualizarDriversResultDto> {
    return this.http.put<ActualizarDriversResultDto>(
      `${this.base}/ratios/proyectos/${projectId}/drivers`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  calcularRatios(projectId: number): Observable<{ ratiosCalculados: number }> {
    return this.http.post<{ ratiosCalculados: number }>(
      `${this.base}/ratios/proyectos/${projectId}/calcular`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  // ── Presupuesto ───────────────────────────────────────────────────

  generarPresupuesto(projectId: number, dto: GenerarPresupuestoDto): Observable<PresupuestoDetalleDto> {
    return this.http.post<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/proyectos/${projectId}/generar`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  getPresupuestosPorProyecto(projectId: number): Observable<PresupuestoResumenDto[]> {
    return this.http.get<PresupuestoResumenDto[]>(
      `${this.base}/presupuestos/proyectos/${projectId}`,
      { headers: buildAuthHeaders() },
    );
  }

  getPresupuestoDetalle(presupuestoId: number): Observable<PresupuestoDetalleDto> {
    return this.http.get<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/${presupuestoId}`,
      { headers: buildAuthHeaders() },
    );
  }

  actualizarLinea(
    presupuestoId: number,
    lineaId: number,
    dto: ActualizarLineaPresupuestoDto,
  ): Observable<PresupuestoDetalleDto> {
    return this.http.put<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/${presupuestoId}/lineas/${lineaId}`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  aprobarPresupuesto(presupuestoId: number): Observable<{ estado: string }> {
    return this.http.post<{ estado: string }>(
      `${this.base}/presupuestos/${presupuestoId}/aprobar`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  // ── Control semanal ───────────────────────────────────────────────

  abrirSemana(dto: AbrirSemanaDto): Observable<ControlSemanaDto> {
    return this.http.post<ControlSemanaDto>(
      `${this.base}/control/semanas`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  registrarConsumo(controlId: number, lineas: RegistrarConsumoLineaDto[]): Observable<ControlSemanaDto> {
    return this.http.put<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}/consumo`,
      lineas,
      { headers: buildAuthHeaders() },
    );
  }

  cerrarSemana(controlId: number): Observable<ControlSemanaDto> {
    return this.http.post<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}/cerrar`,
      {},
      { headers: buildAuthHeaders() },
    );
  }

  getSemana(controlId: number): Observable<ControlSemanaDto> {
    return this.http.get<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}`,
      { headers: buildAuthHeaders() },
    );
  }

  getSemanasPorPresupuesto(presupuestoId: number): Observable<ControlSemanaDto[]> {
    return this.http.get<ControlSemanaDto[]>(
      `${this.base}/control/presupuestos/${presupuestoId}/semanas`,
      { headers: buildAuthHeaders() },
    );
  }

  getDashboard(presupuestoId: number): Observable<DashboardPresupuestoDto> {
    return this.http.get<DashboardPresupuestoDto>(
      `${this.base}/control/presupuestos/${presupuestoId}/dashboard`,
      { headers: buildAuthHeaders() },
    );
  }
}
