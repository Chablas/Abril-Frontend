import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ImportConsumoResultDto,
  ConsumoCargaResumenDto,
  MaterialPendienteDto,
  RevisionDecisionDto,
  RevisionResultDto,
  BuscarItemDto,
  DriverProyectoDto,
  ActualizarDriversDto,
  ActualizarDriversResultDto,
  GenerarPresupuestoDto,
  ActualizarLineaPresupuestoDto,
  PresupuestoResumenDto,
  PresupuestoDetalleDto,
  AbrirSemanaDto,
  RegistrarConsumoLineaDto,
  ControlSemanaDto,
  DashboardPresupuestoDto,
} from './presupuesto.dtos';

@Injectable({ providedIn: 'root' })
export class PresupuestoMaterialesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/presupuesto-materiales`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  importarS10(projectId: number, archivo: File): Observable<ImportConsumoResultDto> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ImportConsumoResultDto>(
      `${this.base}/proyectos/${projectId}/cargas`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  listarCargas(projectId: number): Observable<ConsumoCargaResumenDto[]> {
    return this.http.get<ConsumoCargaResumenDto[]>(
      `${this.base}/proyectos/${projectId}/cargas`,
      { headers: this.authHeaders() },
    );
  }

  estandarizar(cargaId: number): Observable<ImportConsumoResultDto> {
    return this.http.post<ImportConsumoResultDto>(
      `${this.base}/cargas/${cargaId}/estandarizar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  getPendientes(projectId: number): Observable<MaterialPendienteDto[]> {
    return this.http.get<MaterialPendienteDto[]>(
      `${this.base}/proyectos/${projectId}/revision/pendientes`,
      { headers: this.authHeaders() },
    );
  }

  procesarRevision(
    projectId: number,
    decisiones: RevisionDecisionDto[],
  ): Observable<RevisionResultDto> {
    return this.http.post<RevisionResultDto>(
      `${this.base}/proyectos/${projectId}/revision/procesar`,
      { projectId, decisiones },
      { headers: this.authHeaders() },
    );
  }

  buscarItems(q: string): Observable<BuscarItemDto[]> {
    return this.http.get<BuscarItemDto[]>(`${this.base}/catalogo/items/buscar`, {
      headers: this.authHeaders(),
      params: { q },
    });
  }

  // ── Drivers ───────────────────────────────────────────────────────

  getDrivers(): Observable<DriverProyectoDto[]> {
    return this.http.get<DriverProyectoDto[]>(`${this.base}/ratios/proyectos/drivers`, {
      headers: this.authHeaders(),
    });
  }

  actualizarDrivers(projectId: number, dto: ActualizarDriversDto): Observable<ActualizarDriversResultDto> {
    return this.http.put<ActualizarDriversResultDto>(
      `${this.base}/ratios/proyectos/${projectId}/drivers`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  calcularRatios(projectId: number): Observable<{ ratiosCalculados: number }> {
    return this.http.post<{ ratiosCalculados: number }>(
      `${this.base}/ratios/proyectos/${projectId}/calcular`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // ── Presupuesto ───────────────────────────────────────────────────

  generarPresupuesto(projectId: number, dto: GenerarPresupuestoDto): Observable<PresupuestoDetalleDto> {
    return this.http.post<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/proyectos/${projectId}/generar`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  getPresupuestosPorProyecto(projectId: number): Observable<PresupuestoResumenDto[]> {
    return this.http.get<PresupuestoResumenDto[]>(
      `${this.base}/presupuestos/proyectos/${projectId}`,
      { headers: this.authHeaders() },
    );
  }

  getPresupuestoDetalle(presupuestoId: number): Observable<PresupuestoDetalleDto> {
    return this.http.get<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/${presupuestoId}`,
      { headers: this.authHeaders() },
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
      { headers: this.authHeaders() },
    );
  }

  aprobarPresupuesto(presupuestoId: number): Observable<{ estado: string }> {
    return this.http.post<{ estado: string }>(
      `${this.base}/presupuestos/${presupuestoId}/aprobar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // ── Control semanal ───────────────────────────────────────────────

  abrirSemana(dto: AbrirSemanaDto): Observable<ControlSemanaDto> {
    return this.http.post<ControlSemanaDto>(`${this.base}/control/semanas`, dto, {
      headers: this.authHeaders(),
    });
  }

  registrarConsumo(controlId: number, lineas: RegistrarConsumoLineaDto[]): Observable<ControlSemanaDto> {
    return this.http.put<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}/consumo`,
      lineas,
      { headers: this.authHeaders() },
    );
  }

  cerrarSemana(controlId: number): Observable<ControlSemanaDto> {
    return this.http.post<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}/cerrar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  getSemanasPorPresupuesto(presupuestoId: number): Observable<ControlSemanaDto[]> {
    return this.http.get<ControlSemanaDto[]>(
      `${this.base}/control/presupuestos/${presupuestoId}/semanas`,
      { headers: this.authHeaders() },
    );
  }

  getDashboard(presupuestoId: number): Observable<DashboardPresupuestoDto> {
    return this.http.get<DashboardPresupuestoDto>(
      `${this.base}/control/presupuestos/${presupuestoId}/dashboard`,
      { headers: this.authHeaders() },
    );
  }
}
