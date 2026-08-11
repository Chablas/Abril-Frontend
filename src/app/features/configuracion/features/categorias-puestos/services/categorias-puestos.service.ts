import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CatalogosAdminDto,
  CategoriaAdminDto,
  PuestoAdminDto,
  PuestoUpsertRequest,
} from '../dtos/categorias-puestos.dto';

@Injectable({ providedIn: 'root' })
export class CategoriasPuestosService {
  private base = `${environment.apiUrl}api/v1/habilitacion/catalogos`;

  constructor(private http: HttpClient) {}

  /** Carga inicial de la pantalla: categorías + puestos en una sola petición. */
  getInitialData(): Observable<CatalogosAdminDto> {
    return this.http.get<CatalogosAdminDto>(`${this.base}/admin`);
  }

  // ── Categorías ──────────────────────────────────────────────────────

  crearCategoria(nombre: string): Observable<CategoriaAdminDto> {
    return this.http.post<CategoriaAdminDto>(`${this.base}/categorias`, { nombre });
  }

  actualizarCategoria(id: number, nombre: string): Observable<CategoriaAdminDto> {
    return this.http.put<CategoriaAdminDto>(`${this.base}/categorias/${id}`, { nombre });
  }

  toggleCategoria(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/categorias/${id}/toggle`, { activo });
  }

  // ── Puestos ─────────────────────────────────────────────────────────

  crearPuesto(req: PuestoUpsertRequest): Observable<PuestoAdminDto> {
    return this.http.post<PuestoAdminDto>(`${this.base}/puestos`, req);
  }

  actualizarPuesto(id: number, req: PuestoUpsertRequest): Observable<PuestoAdminDto> {
    return this.http.put<PuestoAdminDto>(`${this.base}/puestos/${id}`, req);
  }

  togglePuesto(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/puestos/${id}/toggle`, { activo });
  }
}
