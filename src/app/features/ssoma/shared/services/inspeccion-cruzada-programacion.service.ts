import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AnilloDTO,
  ProgramacionInspeccionCruzadaDTO,
  ProyectoSimpleInspeccionCruzadaDTO,
  ReordenarItemDTO,
} from '../dtos/inspeccion-cruzada-programacion.dtos';

@Injectable({ providedIn: 'root' })
export class InspeccionCruzadaProgramacionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/inspeccion-cruzada-programacion`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getProyectosDisponibles(): Observable<ProyectoSimpleInspeccionCruzadaDTO[]> {
    return this.http.get<ProyectoSimpleInspeccionCruzadaDTO[]>(`${this.base}/proyectos-disponibles`, {
      headers: this.authHeaders(),
    });
  }

  getAnillos(): Observable<AnilloDTO[]> {
    return this.http.get<AnilloDTO[]>(`${this.base}/anillos`, { headers: this.authHeaders() });
  }

  crearAnillo(nombre: string): Observable<AnilloDTO> {
    return this.http.post<AnilloDTO>(`${this.base}/anillos`, { nombre }, { headers: this.authHeaders() });
  }

  agregarMiembro(anilloId: number, proyectoId: number): Observable<any> {
    return this.http.post(
      `${this.base}/anillos/${anilloId}/miembros`,
      { proyectoId },
      { headers: this.authHeaders() },
    );
  }

  reordenar(items: ReordenarItemDTO[]): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/miembros/reordenar`,
      { items },
      { headers: this.authHeaders() },
    );
  }

  setActivo(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/miembros/${id}/activo`,
      { activo },
      { headers: this.authHeaders() },
    );
  }

  getCalendario(
    anioDesde: number,
    mesDesde: number,
    anioHasta: number,
    mesHasta: number,
  ): Observable<ProgramacionInspeccionCruzadaDTO[]> {
    return this.http.get<ProgramacionInspeccionCruzadaDTO[]>(`${this.base}/calendario`, {
      headers: this.authHeaders(),
      params: { anioDesde, mesDesde, anioHasta, mesHasta },
    });
  }

  reasignar(
    id: number,
    proyectoInspectorId: number,
    proyectoInspeccionadoId: number,
    motivo?: string,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/calendario/${id}/reasignar`,
      { proyectoInspectorId, proyectoInspeccionadoId, motivo },
      { headers: this.authHeaders() },
    );
  }
}
