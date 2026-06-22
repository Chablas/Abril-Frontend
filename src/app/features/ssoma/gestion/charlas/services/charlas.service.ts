import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ProyectoInfo,
  Staff,
  CharlaResumen,
  AsistenciaDetail,
  Capacitacion,
  Resumen,
  CrearCharlaDto,
  GuardarAsistenciaDto,
} from '../dtos/charlas.dtos';

@Injectable({ providedIn: 'root' })
export class CharlasService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-charlas`;

  constructor(private http: HttpClient) {}

  private getUserId(): number {
    try {
      const user = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      return user ? (JSON.parse(user)?.id ?? 0) : 0;
    } catch {
      return 0;
    }
  }

  getTodosProyectos(): Observable<ProyectoInfo[]> {
    return this.http.get<ProyectoInfo[]>(`${this.base}/proyectos`);
  }

  getResumen(proyectoId: number, mes: number, anio: number): Observable<Resumen> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<Resumen>(`${this.base}/resumen`, { params });
  }

  getMiProyecto(): Observable<ProyectoInfo | null> {
    return this.http.get<ProyectoInfo | null>(
      `${this.base}/mi-proyecto?userId=${this.getUserId()}`,
    );
  }

  getStaff(proyectoId: number): Observable<Staff[]> {
    return this.http.get<Staff[]>(`${this.base}/staff?proyectoId=${proyectoId}`);
  }

  // Tab 1
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
    return this.http.post<void>(
      `${this.base}/charlas/${charlaId}/asistencia?userId=${this.getUserId()}`,
      dto,
    );
  }

  // Tab 2
  getCapacitaciones(proyectoId: number, mes: number, anio: number): Observable<Capacitacion[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<Capacitacion[]>(`${this.base}/capacitaciones`, { params });
  }

  subirCapacitacion(workerId: number, fecha: string, tema: string, file: File): Observable<Capacitacion> {
    const formData = new FormData();
    formData.append('fecha', fecha);
    formData.append('tema', tema);
    formData.append('file', file);
    return this.http.post<Capacitacion>(
      `${this.base}/capacitaciones/${workerId}?userId=${this.getUserId()}`,
      formData,
    );
  }

  cambiarEstado(id: number, estado: string): Observable<Capacitacion> {
    return this.http.put<Capacitacion>(
      `${this.base}/capacitaciones/${id}/estado?userId=${this.getUserId()}`,
      { estado },
    );
  }

  eliminarCapacitacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/capacitaciones/${id}`);
  }
}
