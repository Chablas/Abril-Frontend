import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActivoRotativoMaterialDto,
  ActivoRotativoMaterialUpsertDto,
  ActivoRotativoListDto,
  ActivoRotativoDetalleDto,
  ActivoRotativoUpsertDto,
  ActivoRotativoMoverDto,
  PresupuestoItemBuscarDto,
  ResponsableSsomaDto,
} from './activos-rotativos.dtos';

@Injectable({ providedIn: 'root' })
export class ActivosRotativosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/activos-rotativos`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  // ─── Materiales ────────────────────────────────────────────────────────────

  getMateriales(): Observable<ActivoRotativoMaterialDto[]> {
    return this.http.get<ActivoRotativoMaterialDto[]>(`${this.base}/materiales`, {
      headers: this.authHeaders(),
    });
  }

  createMaterial(dto: ActivoRotativoMaterialUpsertDto): Observable<ActivoRotativoMaterialDto> {
    return this.http.post<ActivoRotativoMaterialDto>(`${this.base}/materiales`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateMaterial(materialId: number, dto: ActivoRotativoMaterialUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/materiales/${materialId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteMaterial(materialId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/materiales/${materialId}`, {
      headers: this.authHeaders(),
    });
  }

  getResponsablesSsoma(): Observable<ResponsableSsomaDto[]> {
    return this.http.get<ResponsableSsomaDto[]>(`${this.base}/responsables-ssoma`, {
      headers: this.authHeaders(),
    });
  }

  buscarItemPresupuesto(q: string): Observable<PresupuestoItemBuscarDto[]> {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<PresupuestoItemBuscarDto[]>(`${this.base}/materiales/buscar-item-presupuesto${params}`, {
      headers: this.authHeaders(),
    });
  }

  // ─── Activos ─────────────────────────────────────────────────────────────────

  getActivos(): Observable<ActivoRotativoListDto[]> {
    return this.http.get<ActivoRotativoListDto[]>(this.base, { headers: this.authHeaders() });
  }

  getActivoDetalle(activoId: number): Observable<ActivoRotativoDetalleDto> {
    return this.http.get<ActivoRotativoDetalleDto>(`${this.base}/${activoId}`, {
      headers: this.authHeaders(),
    });
  }

  createActivo(dto: ActivoRotativoUpsertDto): Observable<ActivoRotativoDetalleDto> {
    return this.http.post<ActivoRotativoDetalleDto>(this.base, dto, { headers: this.authHeaders() });
  }

  updateActivo(activoId: number, dto: ActivoRotativoUpsertDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${activoId}`, dto, { headers: this.authHeaders() });
  }

  deleteActivo(activoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${activoId}`, { headers: this.authHeaders() });
  }

  moverActivo(activoId: number, dto: ActivoRotativoMoverDto): Observable<ActivoRotativoDetalleDto> {
    return this.http.post<ActivoRotativoDetalleDto>(`${this.base}/${activoId}/mover`, dto, {
      headers: this.authHeaders(),
    });
  }
}
