import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  ProyectoInfo, Staff, CharlaResumen, AsistenciaDetail, Capacitacion, Resumen,
  CrearCharlaDto, GuardarAsistenciaDto,
  DashSupervisoresRow, ComparativoMes, NuevaCharlaCreateDto,
  CharlaListResult, CharlaDetalle, UsuarioDto,
} from '../dtos/charlas.dtos';

@Injectable({ providedIn: 'root' })
export class CharlasService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-charlas`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getUserId(): number {
    return this.auth.getCurrentUserId();
  }

  // ── Proyectos / Staff ────────────────────────────────────────────────────────
  getTodosProyectos(): Observable<ProyectoInfo[]> {
    return this.http.get<ProyectoInfo[]>(`${this.base}/proyectos`);
  }

  getMiProyecto(): Observable<ProyectoInfo | null> {
    return this.http.get<ProyectoInfo | null>(`${this.base}/mi-proyecto?userId=${this.getUserId()}`);
  }

  getStaff(proyectoId: number): Observable<Staff[]> {
    return this.http.get<Staff[]>(`${this.base}/staff?proyectoId=${proyectoId}`);
  }

  getResumen(proyectoId: number, mes: number, anio: number): Observable<Resumen> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<Resumen>(`${this.base}/resumen`, { params });
  }

  // ── Old Tab 1: Asistencia (kept for compatibility) ──────────────────────────
  getCharlas(proyectoId: number, mes: number, anio: number): Observable<CharlaResumen[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<CharlaResumen[]>(`${this.base}/charlas`, { params });
  }

  crearCharla(dto: CrearCharlaDto): Observable<CharlaResumen> {
    return this.http.post<CharlaResumen>(`${this.base}/charlas?userId=${this.getUserId()}`, dto);
  }

  eliminarCharla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/charlas/${id}`);
  }

  getAsistencia(charlaId: number): Observable<AsistenciaDetail[]> {
    return this.http.get<AsistenciaDetail[]>(`${this.base}/charlas/${charlaId}/asistencia`);
  }

  guardarAsistencia(charlaId: number, dto: GuardarAsistenciaDto): Observable<void> {
    return this.http.post<void>(`${this.base}/charlas/${charlaId}/asistencia?userId=${this.getUserId()}`, dto);
  }

  // ── Old Tab 2: Capacitaciones ────────────────────────────────────────────────
  getCapacitaciones(proyectoId: number, mes: number, anio: number): Observable<Capacitacion[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<Capacitacion[]>(`${this.base}/capacitaciones`, { params });
  }

  subirCapacitacion(fecha: string, tema: string, file: File): Observable<Capacitacion> {
    const userId = this.getUserId();
    const formData = new FormData();
    formData.append('fecha', fecha);
    formData.append('tema', tema);
    formData.append('file', file);
    return this.http.post<Capacitacion>(`${this.base}/capacitaciones/mi-evidencia?userId=${userId}`, formData);
  }

  cambiarEstado(id: number, estado: string): Observable<Capacitacion> {
    return this.http.put<Capacitacion>(`${this.base}/capacitaciones/${id}/estado?userId=${this.getUserId()}`, { estado });
  }

  eliminarCapacitacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/capacitaciones/${id}`);
  }

  // ── NEW: Tab 1 — Dashboard Asistencia Supervisores ──────────────────────────
  getDashboardSupervisores(proyectoId: number, mes: number, anio: number): Observable<DashSupervisoresRow[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<DashSupervisoresRow[]>(`${this.base}/dashboard-supervisores`, { params });
  }

  // ── NEW: Tab 2 — Comparativo ─────────────────────────────────────────────────
  getComparativo(proyectoId: number, anio: number): Observable<ComparativoMes[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('anio', anio);
    return this.http.get<ComparativoMes[]>(`${this.base}/comparativo`, { params });
  }

  // ── NEW: Tab 3 — Crear nueva charla ─────────────────────────────────────────
  crearNuevaCharla(dto: NuevaCharlaCreateDto): Observable<any> {
    return this.http.post<any>(`${this.base}/nueva?userId=${this.getUserId()}`, dto);
  }

  // ── NEW: Tab 4 — Evidencia / Aprobación ─────────────────────────────────────
  getLista(proyectoId?: number, estado?: string, page = 1, pageSize = 20): Observable<CharlaListResult> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    if (estado) params = params.set('estado', estado);
    return this.http.get<CharlaListResult>(`${this.base}/lista`, { params });
  }

  getDetalle(id: number): Observable<CharlaDetalle> {
    return this.http.get<CharlaDetalle>(`${this.base}/${id}/detalle`);
  }

  aprobar(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}/aprobar?userId=${this.getUserId()}`, {});
  }

  rechazar(id: number, motivo: string): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}/rechazar?userId=${this.getUserId()}`, { motivo });
  }

  // ── NEW: Supervisor (app_user) search ────────────────────────────────────────
  getSupervisores(search?: string): Observable<UsuarioDto[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<UsuarioDto[]>(`${this.base}/supervisores`, { params });
  }
}
