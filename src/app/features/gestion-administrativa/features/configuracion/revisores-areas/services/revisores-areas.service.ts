import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  RevisoresAreaDetalleDTO,
  RevisoresAreaGuardarDTO,
  RevisoresAreasInicialDTO,
} from '../dtos/revisores-areas.dto';

/** Gestión Administrativa → Configuración → Revisores de Áreas. */
@Injectable({ providedIn: 'root' })
export class RevisoresAreasService {
  private readonly base = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/revisores-areas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: la tabla (con los cinco actores de cada fila), los catálogos y el selector. */
  getInitialData(): Observable<RevisoresAreasInicialDTO> {
    return this.http.get<RevisoresAreasInicialDTO>(this.base, { headers: this.headers });
  }

  /** El detalle de una fila: todos los casos y lo personalizado en ella. */
  getDetalle(areaScopeId: number, projectId: number | null): Observable<RevisoresAreaDetalleDTO> {
    const params: Record<string, string> = projectId != null ? { projectId: String(projectId) } : {};
    return this.http.get<RevisoresAreaDetalleDTO>(`${this.base}/${areaScopeId}`, {
      headers: this.headers,
      params,
    });
  }

  /** Guarda la fila entera de una vez; devuelve su detalle recalculado. */
  guardar(areaScopeId: number, dto: RevisoresAreaGuardarDTO): Observable<RevisoresAreaDetalleDTO> {
    return this.http.put<RevisoresAreaDetalleDTO>(`${this.base}/${areaScopeId}`, dto, {
      headers: this.headers,
    });
  }
}
